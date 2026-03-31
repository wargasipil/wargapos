package marketplace_service

import (
	"context"
	"time"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) CreateCustomerAddress(
	ctx context.Context,
	req *connect.Request[marketplacev1.CreateCustomerAddressRequest],
) (*connect.Response[marketplacev1.CreateCustomerAddressResponse], error) {
	if req.Msg.Address == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, nil)
	}

	addr := models.MarketplaceCustomerAddress{
		CustomerID: req.Msg.CustomerId,
		Label:      req.Msg.Label,
		Address:    req.Msg.Address,
		City:       req.Msg.City,
		Province:   req.Msg.Province,
		PostalCode: req.Msg.PostalCode,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(&addr).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplacev1.CreateCustomerAddressResponse{
		Address: toAddressProto(addr),
	}), nil
}
