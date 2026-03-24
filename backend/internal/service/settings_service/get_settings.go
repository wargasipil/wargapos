package settings_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

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
			ManualPayment:      &settingsv1.ManualPaymentSettings{},
			Printer:            &settingsv1.PrinterSettings{},
			Backup:             &settingsv1.BackupSettings{IntervalHours: 24, RetentionCount: 7, BackupDir: "./backups"},
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
		ManualPayment: &settingsv1.ManualPaymentSettings{
			BankName:          row.BankName,
			BankAccountNumber: row.BankAccountNumber,
			BankAccountName:   row.BankAccountName,
			QrisImageUrl:      row.QrisImageUrl,
		},
		Printer: &settingsv1.PrinterSettings{
			Title:       row.PrinterTitle,
			Description: row.PrinterDescription,
			Address:     row.PrinterAddress,
			Address2:    row.PrinterAddress2,
			Contact:     row.PrinterContact,
			Footer:      row.PrinterFooter,
			PrintMode:   settingsv1.PrintMode(row.PrinterMode),
		},
		Backup: &settingsv1.BackupSettings{
			Enabled:        row.BackupEnabled,
			IntervalHours:  row.BackupIntervalHours,
			RetentionCount: row.BackupRetentionCount,
			BackupDir:      row.BackupDir,
			LastBackupAt:   backupLastAt(row.BackupLastAt),
		},
	}), nil
}

func backupLastAt(t *time.Time) *timestamppb.Timestamp {
	if t == nil {
		return nil
	}
	return timestamppb.New(*t)
}
