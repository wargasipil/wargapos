package settings_service

import (
	"gorm.io/gorm"

	"wargapos/backend/gen/wargapos/settings/v1/settingsv1connect"
	"wargapos/backend/internal/config"
)

// SettingsService implements settingsv1connect.SettingsServiceHandler.
type SettingsService struct {
	db  *gorm.DB
	cfg config.MidtransConfig
}

// NewSettingsService is the Wire provider constructor.
func NewSettingsService(db *gorm.DB, midtransCfg config.MidtransConfig) *SettingsService {
	return &SettingsService{db: db, cfg: midtransCfg}
}

var _ settingsv1connect.SettingsServiceHandler = (*SettingsService)(nil)
