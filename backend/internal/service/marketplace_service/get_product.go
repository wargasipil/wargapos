package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) GetProduct(ctx context.Context, req *connect.Request[marketplacev1.GetProductRequest]) (*connect.Response[marketplacev1.GetProductResponse], error) {
	var product models.MarketplaceProduct
	if err := s.db.First(&product, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&marketplacev1.GetProductResponse{
		Product: toProductProto(product),
	}), nil
}
