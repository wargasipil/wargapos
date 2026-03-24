package backup_service

import (
	"path/filepath"

	"gorm.io/gorm"

	backupv1connect "wargapos/backend/gen/wargapos/backup/v1/backupv1connect"
	"wargapos/backend/internal/config"
)

// BackupService implements backupv1connect.BackupServiceHandler.
type BackupService struct {
	db      *gorm.DB
	cfg     *config.Config
	authCfg config.AuthConfig
}

// NewBackupService is the Wire provider constructor.
func NewBackupService(db *gorm.DB, cfg *config.Config, authCfg config.AuthConfig) *BackupService {
	return &BackupService{db: db, cfg: cfg, authCfg: authCfg}
}

var _ backupv1connect.BackupServiceHandler = (*BackupService)(nil)

func (s *BackupService) backupDir() string {
	return filepath.Join(s.cfg.GetBase(), "./backups")
}
