package backup_service

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"connectrpc.com/connect"

	backupv1 "wargapos/backend/gen/wargapos/backup/v1"
)

func (s *BackupService) DeleteBackup(
	ctx context.Context,
	req *connect.Request[backupv1.DeleteBackupRequest],
) (*connect.Response[backupv1.DeleteBackupResponse], error) {
	fname := req.Msg.Fname
	if strings.ContainsAny(fname, `/\`) || filepath.Base(fname) != fname ||
		!strings.HasSuffix(fname, ".sql.gz") {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid file name"))
	}
	fpath := filepath.Join(s.backupDir(), fname)
	if err := os.Remove(fpath); err != nil {
		if os.IsNotExist(err) {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("file not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&backupv1.DeleteBackupResponse{}), nil
}
