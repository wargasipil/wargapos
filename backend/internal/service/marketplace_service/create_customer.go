package marketplace_service

import (
	"context"
	"time"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) CreateCustomer(
	ctx context.Context,
	req *connect.Request[marketplacev1.CreateCustomerRequest],
) (*connect.Response[marketplacev1.CreateCustomerResponse], error) {
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

	return connect.NewResponse(&marketplacev1.CreateCustomerResponse{
		Customer: toCustomerProto(customer),
	}), nil
}
