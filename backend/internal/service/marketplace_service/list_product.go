package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) ListProducts(ctx context.Context, req *connect.Request[marketplacev1.ListProductsRequest]) (*connect.Response[marketplacev1.ListProductsResponse], error) {
	page := int(req.Msg.Page)
	if page < 1 {
		page = 1
	}
	pageSize := int(req.Msg.PageSize)
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	q := s.db.Model(&models.MarketplaceProduct{})
	if req.Msg.Search != "" {
		q = q.Where("name ILIKE ?", "%"+req.Msg.Search+"%")
	}
	if req.Msg.ActiveOnly {
		q = q.Where("is_active = true")
	}

	var total int64
	q.Count(&total)

	var products []models.MarketplaceProduct
	if err := q.Preload("Stocks").Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&products).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*marketplacev1.MarketplaceProduct, len(products))
	for i, p := range products {
		proto[i] = toProductProto(p)
	}
	return connect.NewResponse(&marketplacev1.ListProductsResponse{
		Products: proto,
		Total:    int32(total),
	}), nil
}
