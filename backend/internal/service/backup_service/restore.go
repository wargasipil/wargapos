package backup_service

import (
	"compress/gzip"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"connectrpc.com/connect"

	backupv1 "wargapos/backend/gen/wargapos/backup/v1"
)

func (s *BackupService) RestoreBackup(
	ctx context.Context,
	req *connect.Request[backupv1.RestoreBackupRequest],
	stream *connect.ServerStream[backupv1.RestoreBackupResponse],
) error {
	fname := req.Msg.Fname
	if strings.ContainsAny(fname, `/\`) || filepath.Base(fname) != fname ||
		!strings.HasSuffix(fname, ".sql.gz") {
		return connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid file name"))
	}

	fpath := filepath.Join(s.backupDir(), fname)
	f, err := os.Open(fpath)
	if err != nil {
		return connect.NewError(connect.CodeNotFound, fmt.Errorf("file not found"))
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return connect.NewError(connect.CodeInternal, err)
	}
	defer gz.Close()

	sw := &RestoreStreamWriter{stream: stream}

	cmd := exec.CommandContext(ctx, "./thirdparties/bin/psql", s.cfg.Database.URL)
	cmd.Dir = s.cfg.GetBase()
	cmd.Stdin = gz
	cmd.Stdout = sw
	cmd.Stderr = sw

	if err := cmd.Run(); err != nil {
		return connect.NewError(connect.CodeInternal, err)
	}
	return stream.Send(&backupv1.RestoreBackupResponse{Msg: "restore complete"})
}

type RestoreStreamWriter struct {
	stream *connect.ServerStream[backupv1.RestoreBackupResponse]
}

func (w *RestoreStreamWriter) Write(p []byte) (int, error) {
	_ = w.stream.Send(&backupv1.RestoreBackupResponse{Msg: string(p)})
	return len(p), nil
}
