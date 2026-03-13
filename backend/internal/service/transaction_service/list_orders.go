package transaction_service

import (
	"context"

	"connectrpc.com/connect"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) ListOrders(
	ctx context.Context,
	req *connect.Request[transactionv1.ListOrdersRequest],
) (*connect.Response[transactionv1.ListOrdersResponse], error) {
	page := req.Msg.Page
	pageSize := req.Msg.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	db := s.db.WithContext(ctx).Model(&models.Order{})
	if req.Msg.CashierId != "" {
		db = db.Where("cashier_id = ?", req.Msg.CashierId)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var orders []models.Order
	if err := db.Preload("Items").
		Order("created_at DESC").
		Offset(int((page-1)*pageSize)).
		Limit(int(pageSize)).
		Find(&orders).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*transactionv1.Order, len(orders))
	for i := range orders {
		proto[i] = toProtoOrder(&orders[i])
	}
	return connect.NewResponse(&transactionv1.ListOrdersResponse{
		Orders: proto,
		Total:  int32(total),
	}), nil
}
