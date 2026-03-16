package device_service

import (
	"context"
	devicev1 "wargapos/backend/gen/wargapos/device/v1"

	"connectrpc.com/connect"
)

// ListPrinters implements [devicev1connect.DeviceServiceHandler].
func (s *DeviceService) ListPrinters(ctx context.Context, req *connect.Request[devicev1.ListPrintersRequest]) (*connect.Response[devicev1.ListPrintersResponse], error) {
	var err error
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result devicev1.ListPrintersResponse
	for _, device := range s.devices {
		for _, printer := range device.Printers {
			if printer == "" {
				continue
			}

			result.Printers = append(result.Printers, &devicev1.Printer{
				DeviceId: device.ID,
				Name:     printer,
			})
		}

	}
	return connect.NewResponse(&result), err

}
