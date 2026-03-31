package marketplace_service

import (
	"context"
	"time"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) DeleteCustomerAddress(
	ctx context.Context,
	req *connect.Request[marketplacev1.DeleteCustomerAddressRequest],
) (*connect.Response[marketplacev1.DeleteCustomerAddressResponse], error) {
	if err := s.db.WithContext(ctx).Model(&models.MarketplaceCustomerAddress{}).
		Where("id = ? AND deleted = false", req.Msg.Id).
		Updates(map[string]any{"deleted": true, "updated_at": time.Now()}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplacev1.DeleteCustomerAddressResponse{}), nil
}
