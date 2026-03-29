package marketplace_service

import (
	"context"
	"time"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) UpdateShop(ctx context.Context, req *connect.Request[marketplacev1.UpdateShopRequest]) (*connect.Response[marketplacev1.UpdateShopResponse], error) {
	var shop models.MarketplaceShop
	if err := s.db.First(&shop, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	shop.Name = req.Msg.Name
	shop.Type = req.Msg.Type
	shop.Username = req.Msg.Username
	shop.URL = req.Msg.Url
	shop.IsActive = req.Msg.IsActive
	shop.UpdatedAt = time.Now()

	if err := s.db.Save(&shop).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&marketplacev1.UpdateShopResponse{
		Shop: toShopProto(shop),
	}), nil
}
