package device_service

import (
	"sync"

	devicev1 "wargapos/backend/gen/wargapos/device/v1"
	"wargapos/backend/gen/wargapos/device/v1/devicev1connect"

	"connectrpc.com/connect"
)

type device struct {
	ID       string
	Name     string
	Printers []string
	stream   *connect.ServerStream[devicev1.ConnectResponse]
}

type DeviceService struct {
	mu      sync.RWMutex
	devices map[string]*device
}

func NewDeviceService() *DeviceService {
	return &DeviceService{devices: make(map[string]*device)}
}

var _ devicev1connect.DeviceServiceHandler = (*DeviceService)(nil)
