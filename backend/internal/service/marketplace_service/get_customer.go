package marketplace_service

import (
	"context"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) GetCustomer(
	ctx context.Context,
	req *connect.Request[marketplacev1.GetCustomerRequest],
) (*connect.Response[marketplacev1.GetCustomerResponse], error) {
	var customer models.MarketplaceCustomer
	if err := s.db.WithContext(ctx).First(&customer, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	return connect.NewResponse(&marketplacev1.GetCustomerResponse{
		Customer: toCustomerProto(customer),
	}), nil
}
