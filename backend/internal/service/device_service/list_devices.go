package device_service

import (
	"context"

	"connectrpc.com/connect"
	devicev1 "wargapos/backend/gen/wargapos/device/v1"
)

func (s *DeviceService) ListDevices(
	_ context.Context,
	_ *connect.Request[devicev1.ListDevicesRequest],
) (*connect.Response[devicev1.ListDevicesResponse], error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	devices := make([]*devicev1.Device, 0, len(s.devices))
	for _, d := range s.devices {
		devices = append(devices, &devicev1.Device{Id: d.ID, Name: d.Name})
	}

	return connect.NewResponse(&devicev1.ListDevicesResponse{Devices: devices}), nil
}
