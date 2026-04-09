package marketplace_order_service

import (
	"context"
	"time"

	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) DeleteCustomerAddress(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.DeleteCustomerAddressRequest],
) (*connect.Response[marketplaceorderv1.DeleteCustomerAddressResponse], error) {
	if err := s.db.WithContext(ctx).Model(&models.MarketplaceCustomerAddress{}).
		Where("id = ? AND deleted = false", req.Msg.Id).
		Updates(map[string]any{"deleted": true, "updated_at": time.Now()}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplaceorderv1.DeleteCustomerAddressResponse{}), nil
}
