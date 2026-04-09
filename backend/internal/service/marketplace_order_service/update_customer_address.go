package marketplace_order_service

import (
	"context"
	"time"

	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) UpdateCustomerAddress(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.UpdateCustomerAddressRequest],
) (*connect.Response[marketplaceorderv1.UpdateCustomerAddressResponse], error) {
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

	return connect.NewResponse(&marketplaceorderv1.UpdateCustomerAddressResponse{
		Address: toAddressProto(addr),
	}), nil
}
