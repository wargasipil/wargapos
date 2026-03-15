package settings_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"

	settingsv1 "wargapos/backend/gen/wargapos/settings/v1"
	"wargapos/backend/internal/models"
)

func (s *SettingsService) UpdateSettings(
	ctx context.Context,
	req *connect.Request[settingsv1.UpdateSettingsRequest],
) (*connect.Response[settingsv1.UpdateSettingsResponse], error) {
	if req.Msg.Midtrans == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("midtrans settings are required"))
	}

	m := req.Msg.Midtrans
	env := m.Environment
	if env != "sandbox" && env != "production" {
		env = "sandbox"
	}

	updates := map[string]any{
		"midtrans_server_key":  m.ServerKey,
		"midtrans_client_key":  m.ClientKey,
		"midtrans_environment": env,
		"updated_at":           time.Now(),
	}
	result := s.db.WithContext(ctx).Model(&models.AppSettings{}).Where("id = 1").Updates(updates)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		row := models.AppSettings{
			ID:                  1,
			MidtransServerKey:   m.ServerKey,
			MidtransClientKey:   m.ClientKey,
			MidtransEnvironment: env,
		}
		if err := s.db.WithContext(ctx).Create(&row).Error; err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&settingsv1.UpdateSettingsResponse{}), nil
}
