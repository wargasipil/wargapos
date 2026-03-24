package backup_service

import (
	"context"
	"os"
	"sort"
	"strings"

	"connectrpc.com/connect"

	backupv1 "wargapos/backend/gen/wargapos/backup/v1"
)

func (s *BackupService) ListBackup(
	ctx context.Context,
	_ *connect.Request[backupv1.ListBackupRequest],
) (*connect.Response[backupv1.ListBackupResponse], error) {
	dir := s.backupDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return connect.NewResponse(&backupv1.ListBackupResponse{}), nil
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	var fnames []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql.gz") {
			continue
		}
		fnames = append(fnames, e.Name())
	}
	// newest first — filenames embed a timestamp so reverse-alpha = newest-first
	sort.Sort(sort.Reverse(sort.StringSlice(fnames)))
	return connect.NewResponse(&backupv1.ListBackupResponse{Fnames: fnames}), nil
}
