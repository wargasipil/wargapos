package marketplace_service

import (
	"context"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) DeleteCustomer(
	ctx context.Context,
	req *connect.Request[marketplacev1.DeleteCustomerRequest],
) (*connect.Response[marketplacev1.DeleteCustomerResponse], error) {
	if err := s.db.WithContext(ctx).Delete(&models.MarketplaceCustomer{}, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplacev1.DeleteCustomerResponse{}), nil
}
