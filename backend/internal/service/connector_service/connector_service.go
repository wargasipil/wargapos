package connector_service

import (
	"wargapos/backend/gen/wargapos/connector/v1/connectorv1connect"
	"wargapos/backend/internal/config"
)

type ConnectorService struct {
	cfg config.ConnectorConfig
}

func NewConnectorService(cfg config.ConnectorConfig) *ConnectorService {
	return &ConnectorService{cfg: cfg}
}

var _ connectorv1connect.ConnectorServiceHandler = (*ConnectorService)(nil)
