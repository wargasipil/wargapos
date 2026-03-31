package marketplace_service

import (
	"context"
	"time"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) UpdateCustomerAddress(
	ctx context.Context,
	req *connect.Request[marketplacev1.UpdateCustomerAddressRequest],
) (*connect.Response[marketplacev1.UpdateCustomerAddressResponse], error) {
	var addr models.MarketplaceCustomerAddress
	if err := s.db.WithContext(ctx).Where("id = ? AND deleted = false", req.Msg.Id).First(&addr).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	if err := s.db.WithContext(ctx).Model(&addr).Updates(map[string]any{
		"label":       req.Msg.Label,
		"address":     req.Msg.Address,
		"city":        req.Msg.City,
		"province":    req.Msg.Province,
		"postal_code": req.Msg.PostalCode,
		"updated_at":  time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplacev1.UpdateCustomerAddressResponse{
		Address: toAddressProto(addr),
	}), nil
}
