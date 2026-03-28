package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) ListSku(
	ctx context.Context,
	req *connect.Request[stockv1.ListSkuRequest],
) (*connect.Response[stockv1.ListSkuResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&models.Sku{}).Where("deleted = false")
	if req.Msg.ProductId > 0 {
		q = q.Where("product_id = ?", req.Msg.ProductId)
	}
	if req.Msg.Search != "" {
		q = q.Where("code ILIKE ?", "%"+req.Msg.Search+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var skus []models.Sku
	if err := q.Order("id asc").Limit(pageSize).Offset(offset).Find(&skus).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*stockv1.Sku, len(skus))
	for i := range skus {
		proto[i] = toProtoSku(&skus[i])
	}

	return connect.NewResponse(&stockv1.ListSkuResponse{
		Skus:  proto,
		Total: int32(total),
	}), nil
}
