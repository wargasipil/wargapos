package backup_service

import (
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"time"

	"connectrpc.com/connect"

	backupv1 "wargapos/backend/gen/wargapos/backup/v1"
	"wargapos/backend/internal/models"
)

func (s *BackupService) RunBackup(
	ctx context.Context,
	_ *connect.Request[backupv1.RunBackupRequest],
	stream *connect.ServerStream[backupv1.RunBackupResponse],
) error {
	var err error
	send := func(msg string) error {
		return stream.Send(&backupv1.RunBackupResponse{
			Data: &backupv1.RunBackupResponse_Msg{Msg: msg},
		})
	}

	if err = send("starting backup..."); err != nil {
		return err
	}

	var settings models.AppSettings
	if err = s.db.First(&settings).Error; err != nil {
		return connect.NewError(connect.CodeInternal, fmt.Errorf("load settings: %w", err))
	}

	dir := settings.BackupDir
	if dir == "" {
		dir = "./backups"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return connect.NewError(connect.CodeInternal, err)
	}

	stamp := time.Now().Format("20060102_150405")
	filename := "wargapos_" + stamp + ".sql.gz"

	if err = send("running pg_dump..."); err != nil {
		return err
	}

	// stream writer
	streamWritter := &StreamWriter{
		ServerStream: stream,
	}

	// running dump
	err = s.runPgDump(ctx, filename, streamWritter)

	if err != nil {
		return stream.Send(&backupv1.RunBackupResponse{
			Data: &backupv1.RunBackupResponse_Msg{
				Msg: err.Error(),
			},
		})
	}

	err = stream.Send(&backupv1.RunBackupResponse{
		Data: &backupv1.RunBackupResponse_Filepath{Filepath: filename},
	})

	return err
}

func (s *BackupService) runPgDump(ctx context.Context, dst string, writer io.Writer) error {

	fname := path.Join(s.backupDir(), dst)

	// init directory
	// initializing directory
	if err := os.MkdirAll(filepath.Dir(fname), 0755); err != nil {
		return err
	}

	// creating file
	f, err := os.Create(fname)
	if err != nil {
		return err
	}
	defer f.Close()

	gz := gzip.NewWriter(f)
	defer gz.Close()

	multiwriter := io.MultiWriter(
		gz,
		writer,
	)

	// slog.Info(s.cfg.Database.URL, dir)

	// cmd := exec.CommandContext(ctx, filepath.Join(dir, "bin/pg_dump"))
	cmd := exec.CommandContext(ctx,
		"./thirdparties/bin/pg_dump",
		s.cfg.Database.URL,
	)

	cmd.Dir = s.cfg.GetBase()
	cmd.Stdout = multiwriter
	cmd.Stderr = multiwriter

	return cmd.Run()
}

type StreamWriter struct {
	c int
	*connect.ServerStream[backupv1.RunBackupResponse]
}

// Write implements [io.Writer].
func (s *StreamWriter) Write(p []byte) (n int, err error) {
	err = s.ServerStream.Send(&backupv1.RunBackupResponse{
		Data: &backupv1.RunBackupResponse_Msg{
			Msg: string(p),
		},
	})
	return len(p), err
}
