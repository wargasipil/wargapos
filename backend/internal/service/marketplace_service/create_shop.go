package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) CreateShop(ctx context.Context, req *connect.Request[marketplacev1.CreateShopRequest]) (*connect.Response[marketplacev1.CreateShopResponse], error) {
	shop := models.MarketplaceShop{
		Name:     req.Msg.Name,
		Type:     req.Msg.Type,
		Username: req.Msg.Username,
		URL:      req.Msg.Url,
		IsActive: true,
	}
	if err := s.db.Create(&shop).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&marketplacev1.CreateShopResponse{
		Shop: toShopProto(shop),
	}), nil
}
