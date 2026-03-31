package marketplace_service

import (
	"context"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) ListCustomerAddresses(
	ctx context.Context,
	req *connect.Request[marketplacev1.ListCustomerAddressesRequest],
) (*connect.Response[marketplacev1.ListCustomerAddressesResponse], error) {
	var addrs []models.MarketplaceCustomerAddress
	if err := s.db.WithContext(ctx).
		Where("customer_id = ? AND deleted = false", req.Msg.CustomerId).
		Order("created_at asc").
		Find(&addrs).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*marketplacev1.CustomerAddress, len(addrs))
	for i, a := range addrs {
		proto[i] = toAddressProto(a)
	}

	return connect.NewResponse(&marketplacev1.ListCustomerAddressesResponse{
		Addresses: proto,
	}), nil
}
