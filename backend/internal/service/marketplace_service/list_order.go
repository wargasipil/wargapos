package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) ListOrders(ctx context.Context, req *connect.Request[marketplacev1.ListOrdersRequest]) (*connect.Response[marketplacev1.ListOrdersResponse], error) {
	page := int(req.Msg.Page)
	if page < 1 {
		page = 1
	}
	pageSize := int(req.Msg.PageSize)
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	q := s.db.Model(&models.MarketplaceOrder{})
	if req.Msg.StatusFilter != marketplacev1.MarketplaceOrderStatus_MARKETPLACE_ORDER_STATUS_UNSPECIFIED {
		q = q.Where("status = ?", req.Msg.StatusFilter)
	}
	if req.Msg.ShopId > 0 {
		q = q.Where("shop_id = ?", req.Msg.ShopId)
	}
	if req.Msg.CustomerId > 0 {
		q = q.Where("customer_id = ?", req.Msg.CustomerId)
	}
	if req.Msg.WarehouseId > 0 {
		q = q.Where("warehouse_id = ?", req.Msg.WarehouseId)
	}
	if req.Msg.Search != "" {
		like := "%" + req.Msg.Search + "%"
		q = q.Where("customer_name ILIKE ? OR phone_number ILIKE ?", like, like)
	}
	if req.Msg.DateFrom != "" {
		q = q.Where("created_at >= ?", req.Msg.DateFrom)
	}
	if req.Msg.DateTo != "" {
		q = q.Where("created_at < ?", req.Msg.DateTo+" 23:59:59")
	}

	var total int64
	q.Count(&total)

	var orders []models.MarketplaceOrder
	if err := q.Preload("Shop").Preload("Items").Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&orders).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*marketplacev1.MarketplaceOrder, len(orders))
	for i, o := range orders {
		proto[i] = toOrderProto(o)
	}
	return connect.NewResponse(&marketplacev1.ListOrdersResponse{
		Orders: proto,
		Total:  int32(total),
	}), nil
}
