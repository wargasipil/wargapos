package printer_service

import (
	"context"
	"net"
	"time"

	"connectrpc.com/connect"
	printerv1 "wargapos/backend/gen/wargapos/printer/v1"
)

func (s *PrinterService) GetStatus(
	_ context.Context,
	_ *connect.Request[printerv1.GetStatusRequest],
) (*connect.Response[printerv1.GetStatusResponse], error) {
	conn, err := net.DialTimeout("tcp", s.cfg.Address, 2*time.Second)
	connected := err == nil
	if connected {
		conn.Close()
	}

	return connect.NewResponse(&printerv1.GetStatusResponse{
		Connected:      connected,
		PrinterAddress: s.cfg.Address,
	}), nil
}
