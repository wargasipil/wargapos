package connector_service

import (
	"context"
	"errors"
	"net"
	"time"

	"connectrpc.com/connect"
	connectorv1 "wargapos/backend/gen/wargapos/connector/v1"
)

func (s *ConnectorService) Print(
	_ context.Context,
	req *connect.Request[connectorv1.PrintRequest],
) (*connect.Response[connectorv1.PrintResponse], error) {
	if len(req.Msg.Data) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("data is empty"))
	}

	conn, err := net.DialTimeout("tcp", s.cfg.Address, 5*time.Second)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnavailable, err)
	}
	defer conn.Close()

	conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	if _, err := conn.Write(req.Msg.Data); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&connectorv1.PrintResponse{}), nil
}
