package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) DeleteShop(ctx context.Context, req *connect.Request[marketplacev1.DeleteShopRequest]) (*connect.Response[marketplacev1.DeleteShopResponse], error) {
	if err := s.db.Delete(&models.MarketplaceShop{}, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&marketplacev1.DeleteShopResponse{}), nil
}
