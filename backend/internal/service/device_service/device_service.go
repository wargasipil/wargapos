package device_service

import (
	"sync"

	"wargapos/backend/gen/wargapos/device/v1/devicev1connect"
)

type device struct {
	ID   string
	Name string
}

type DeviceService struct {
	mu      sync.RWMutex
	devices map[string]*device
}

func NewDeviceService() *DeviceService {
	return &DeviceService{devices: make(map[string]*device)}
}

var _ devicev1connect.DeviceServiceHandler = (*DeviceService)(nil)
