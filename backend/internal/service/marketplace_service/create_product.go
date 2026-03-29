package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) CreateProduct(ctx context.Context, req *connect.Request[marketplacev1.CreateProductRequest]) (*connect.Response[marketplacev1.CreateProductResponse], error) {
	product := models.MarketplaceProduct{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
		PriceCents:  req.Msg.PriceCents,
		ImageURL:    req.Msg.ImageUrl,
		IsActive:    true,
	}
	if err := s.db.Create(&product).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&marketplacev1.CreateProductResponse{
		Product: toProductProto(product),
	}), nil
}
