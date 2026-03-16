package connector_service

import (
	"context"
	"net"
	"time"

	"connectrpc.com/connect"
	connectorv1 "wargapos/backend/gen/wargapos/connector/v1"
)

func (s *ConnectorService) GetStatus(
	_ context.Context,
	_ *connect.Request[connectorv1.GetStatusRequest],
) (*connect.Response[connectorv1.GetStatusResponse], error) {
	conn, err := net.DialTimeout("tcp", s.cfg.Address, 2*time.Second)
	connected := err == nil
	if connected {
		conn.Close()
	}

	return connect.NewResponse(&connectorv1.GetStatusResponse{
		Connected:      connected,
		PrinterAddress: s.cfg.Address,
	}), nil
}
