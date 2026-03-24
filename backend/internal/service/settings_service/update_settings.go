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

	mp := req.Msg.ManualPayment
	pp := req.Msg.Printer
	bp := req.Msg.Backup

	updates := map[string]any{
		"midtrans_server_key":  m.ServerKey,
		"midtrans_client_key":  m.ClientKey,
		"midtrans_environment": env,
		"updated_at":           time.Now(),
	}
	if mp != nil {
		updates["bank_name"]            = mp.BankName
		updates["bank_account_number"]  = mp.BankAccountNumber
		updates["bank_account_name"]    = mp.BankAccountName
		updates["qris_image_url"]       = mp.QrisImageUrl
	}
	if pp != nil {
		updates["printer_title"]       = pp.Title
		updates["printer_description"] = pp.Description
		updates["printer_address"]     = pp.Address
		updates["printer_address2"]    = pp.Address2
		updates["printer_contact"]     = pp.Contact
		updates["printer_footer"]      = pp.Footer
		updates["printer_mode"]        = int32(pp.PrintMode)
	}
	if bp != nil {
		updates["backup_enabled"]         = bp.Enabled
		updates["backup_interval_hours"]  = bp.IntervalHours
		updates["backup_retention_count"] = bp.RetentionCount
		updates["backup_dir"]             = bp.BackupDir
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
		if mp != nil {
			row.BankName          = mp.BankName
			row.BankAccountNumber = mp.BankAccountNumber
			row.BankAccountName   = mp.BankAccountName
			row.QrisImageUrl      = mp.QrisImageUrl
		}
		if pp != nil {
			row.PrinterTitle       = pp.Title
			row.PrinterDescription = pp.Description
			row.PrinterAddress     = pp.Address
			row.PrinterAddress2    = pp.Address2
			row.PrinterContact     = pp.Contact
			row.PrinterFooter      = pp.Footer
			row.PrinterMode        = int32(pp.PrintMode)
		}
		if bp != nil {
			row.BackupEnabled        = bp.Enabled
			row.BackupIntervalHours  = bp.IntervalHours
			row.BackupRetentionCount = bp.RetentionCount
			row.BackupDir            = bp.BackupDir
		}
		if err := s.db.WithContext(ctx).Create(&row).Error; err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&settingsv1.UpdateSettingsResponse{}), nil
}
