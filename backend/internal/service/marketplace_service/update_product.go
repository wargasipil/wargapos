package marketplace_service

import (
	"context"
	"time"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) UpdateProduct(ctx context.Context, req *connect.Request[marketplacev1.UpdateProductRequest]) (*connect.Response[marketplacev1.UpdateProductResponse], error) {
	var product models.MarketplaceProduct
	if err := s.db.First(&product, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	product.Name = req.Msg.Name
	product.Description = req.Msg.Description
	product.PriceCents = req.Msg.PriceCents
	product.ImageURL = req.Msg.ImageUrl
	product.IsActive = req.Msg.IsActive
	product.UpdatedAt = time.Now()

	if err := s.db.Save(&product).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&marketplacev1.UpdateProductResponse{
		Product: toProductProto(product),
	}), nil
}
