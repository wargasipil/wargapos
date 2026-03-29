package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) DeleteProduct(ctx context.Context, req *connect.Request[marketplacev1.DeleteProductRequest]) (*connect.Response[marketplacev1.DeleteProductResponse], error) {
	if err := s.db.Delete(&models.MarketplaceProduct{}, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&marketplacev1.DeleteProductResponse{}), nil
}
