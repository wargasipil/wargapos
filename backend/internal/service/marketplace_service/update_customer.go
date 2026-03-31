package marketplace_service

import (
	"context"
	"time"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) UpdateCustomer(
	ctx context.Context,
	req *connect.Request[marketplacev1.UpdateCustomerRequest],
) (*connect.Response[marketplacev1.UpdateCustomerResponse], error) {
	var customer models.MarketplaceCustomer
	if err := s.db.WithContext(ctx).First(&customer, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	if err := s.db.WithContext(ctx).Model(&customer).Updates(map[string]any{
		"name":         req.Msg.Name,
		"phone_number": req.Msg.PhoneNumber,
		"updated_at":   time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplacev1.UpdateCustomerResponse{
		Customer: toCustomerProto(customer),
	}), nil
}
