package settings_service

import (
	"context"

	"connectrpc.com/connect"

	settingsv1 "wargapos/backend/gen/wargapos/settings/v1"
	"wargapos/backend/internal/models"
)

func (s *SettingsService) GetSettings(
	ctx context.Context,
	_ *connect.Request[settingsv1.GetSettingsRequest],
) (*connect.Response[settingsv1.GetSettingsResponse], error) {
	var row models.AppSettings
	if err := s.db.WithContext(ctx).First(&row).Error; err != nil {
		// No row yet — return config.yaml defaults.
		return connect.NewResponse(&settingsv1.GetSettingsResponse{
			Midtrans: &settingsv1.MidtransSettings{
				ServerKey:   s.cfg.ServerKey,
				ClientKey:   s.cfg.ClientKey,
				Environment: s.cfg.Environment,
			},
			MidtransConfigured: s.cfg.ServerKey != "",
		}), nil
	}

	// Prefer DB values; fall back to config.yaml if empty.
	serverKey := row.MidtransServerKey
	if serverKey == "" {
		serverKey = s.cfg.ServerKey
	}
	clientKey := row.MidtransClientKey
	if clientKey == "" {
		clientKey = s.cfg.ClientKey
	}
	environment := row.MidtransEnvironment
	if environment == "" {
		environment = s.cfg.Environment
	}

	return connect.NewResponse(&settingsv1.GetSettingsResponse{
		Midtrans: &settingsv1.MidtransSettings{
			ServerKey:   serverKey,
			ClientKey:   clientKey,
			Environment: environment,
		},
		MidtransConfigured: serverKey != "",
	}), nil
}
