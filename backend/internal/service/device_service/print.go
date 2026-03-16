package device_service

import (
	"context"
	devicev1 "wargapos/backend/gen/wargapos/device/v1"

	"connectrpc.com/connect"
)

// Print implements [devicev1connect.DeviceServiceHandler].
func (s *DeviceService) Print(ctx context.Context, req *connect.Request[devicev1.PrintRequest]) (*connect.Response[devicev1.PrintResponse], error) {
	var err error
	s.mu.RLock()
	defer s.mu.RUnlock()
	printer := req.Msg.Printer
	device, ok := s.devices[printer.DeviceId]

	if !ok {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	err = device.stream.Send(&devicev1.ConnectResponse{
		Result: &devicev1.ConnectResponse_PrintRequest{
			PrintRequest: req.Msg,
		},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&devicev1.PrintResponse{Success: true}), nil
}
