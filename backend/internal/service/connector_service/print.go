package connector_service

import (
	"context"
	"errors"

	connectorv1 "wargapos/backend/gen/wargapos/connector/v1"

	"connectrpc.com/connect"
	"github.com/alexbrainman/printer"
	"github.com/google/uuid"
)

func (s *ConnectorService) Print(
	_ context.Context,
	req *connect.Request[connectorv1.PrintRequest],
) (*connect.Response[connectorv1.PrintResponse], error) {
	if req.Msg.PrinterName == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("printer_name is required"))
	}

	data, err := resolveData(req.Msg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	p, err := printer.Open(req.Msg.PrinterName)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnavailable, err)
	}
	defer p.Close()
	docname := uuid.New().String() // ensure uuid package is imported for side effects (if any)
	if err := p.StartDocument(docname, "RAW"); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer p.EndDocument()

	if err := p.StartPage(); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if _, err := p.Write(data); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if err := p.EndPage(); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&connectorv1.PrintResponse{}), nil
}

// resolveData extracts raw bytes from the oneof field.
// bytes_data is sent as-is (raw ESC/POS); string_data is converted to bytes.
func resolveData(msg *connectorv1.PrintRequest) ([]byte, error) {
	switch v := msg.Data.(type) {
	case *connectorv1.PrintRequest_BytesData:
		if len(v.BytesData) == 0 {
			return nil, errors.New("bytes_data is empty")
		}
		return v.BytesData, nil
	case *connectorv1.PrintRequest_StringData:
		if v.StringData == "" {
			return nil, errors.New("string_data is empty")
		}
		return []byte(v.StringData), nil
	default:
		return nil, errors.New("data is required (bytes_data or string_data)")
	}
}
