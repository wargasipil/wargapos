package printer_service

import (
	"wargapos/backend/gen/wargapos/printer/v1/printerv1connect"
	"wargapos/backend/internal/config"
)

type PrinterService struct {
	cfg config.PrinterConfig
}

func NewPrinterService(cfg config.PrinterConfig) *PrinterService {
	return &PrinterService{cfg: cfg}
}

var _ printerv1connect.PrinterServiceHandler = (*PrinterService)(nil)
