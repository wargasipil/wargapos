package device_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	devicev1 "wargapos/backend/gen/wargapos/device/v1"
)

func (s *DeviceService) Connect(
	ctx context.Context,
	req *connect.Request[devicev1.ConnectRequest],
	stream *connect.ServerStream[devicev1.ConnectResponse],
) error {
	if req.Msg.Id == "" {
		return connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	id := req.Msg.Id
	name := req.Msg.Name
	if name == "" {
		name = id
	}

	s.mu.Lock()
	s.devices[id] = &device{ID: id, Name: name}
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.devices, id)
		s.mu.Unlock()
	}()

	if err := stream.Send(&devicev1.ConnectResponse{
		Device: &devicev1.Device{Id: id, Name: name},
	}); err != nil {
		return err
	}

	// Hold open until client disconnects
	<-ctx.Done()
	return nil
}
