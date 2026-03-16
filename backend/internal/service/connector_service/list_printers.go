package connector_service

import (
	"context"
	connectorv1 "wargapos/backend/gen/wargapos/connector/v1"

	"connectrpc.com/connect"
	"github.com/alexbrainman/printer"
)

// ListPrinters implements [connectorv1connect.ConnectorServiceHandler].
func (s *ConnectorService) ListPrinters(ctx context.Context, req *connect.Request[connectorv1.ListPrintersRequest]) (*connect.Response[connectorv1.ListPrintersResponse], error) {
	var err error
	var result connectorv1.ListPrintersResponse
	result.Names, err = printer.ReadNames()
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&result), nil
}
