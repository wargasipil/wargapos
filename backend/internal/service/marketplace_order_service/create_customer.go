package marketplace_order_service

import (
	"context"
	"time"

	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) CreateCustomer(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.CreateCustomerRequest],
) (*connect.Response[marketplaceorderv1.CreateCustomerResponse], error) {
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, nil)
	}

	customer := models.MarketplaceCustomer{
		Name:        req.Msg.Name,
		PhoneNumber: req.Msg.PhoneNumber,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(&customer).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplaceorderv1.CreateCustomerResponse{
		Customer: toCustomerProto(customer),
	}), nil
}
