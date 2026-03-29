package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) ListShops(ctx context.Context, req *connect.Request[marketplacev1.ListShopsRequest]) (*connect.Response[marketplacev1.ListShopsResponse], error) {
	page := int(req.Msg.Page)
	if page < 1 {
		page = 1
	}
	pageSize := int(req.Msg.PageSize)
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	q := s.db.Model(&models.MarketplaceShop{})
	if req.Msg.Search != "" {
		q = q.Where("name ILIKE ?", "%"+req.Msg.Search+"%")
	}
	if req.Msg.ActiveOnly {
		q = q.Where("is_active = true")
	}

	var total int64
	q.Count(&total)

	var shops []models.MarketplaceShop
	if err := q.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&shops).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*marketplacev1.MarketplaceShop, len(shops))
	for i, s := range shops {
		proto[i] = toShopProto(s)
	}
	return connect.NewResponse(&marketplacev1.ListShopsResponse{
		Shops: proto,
		Total: int32(total),
	}), nil
}
