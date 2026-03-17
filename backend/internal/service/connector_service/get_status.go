package connector_service

import (
	"context"
	"strings"

	"connectrpc.com/connect"
	"github.com/alexbrainman/printer"
	connectorv1 "wargapos/backend/gen/wargapos/connector/v1"
)

func (s *ConnectorService) GetStatus(
	_ context.Context,
	_ *connect.Request[connectorv1.GetStatusRequest],
) (*connect.Response[connectorv1.GetStatusResponse], error) {
	names, err := printer.ReadNames()
	connected := err == nil && len(names) > 0

	var printerList string
	if len(names) > 0 {
		printerList = strings.Join(names, ", ")
	}

	return connect.NewResponse(&connectorv1.GetStatusResponse{
		Connected:      connected,
		PrinterAddress: printerList,
	}), nil
}
