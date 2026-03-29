package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) GetShop(ctx context.Context, req *connect.Request[marketplacev1.GetShopRequest]) (*connect.Response[marketplacev1.GetShopResponse], error) {
	var shop models.MarketplaceShop
	if err := s.db.First(&shop, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&marketplacev1.GetShopResponse{
		Shop: toShopProto(shop),
	}), nil
}
