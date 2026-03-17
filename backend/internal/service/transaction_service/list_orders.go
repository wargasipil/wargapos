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
	if pageSize > 1000 {
		pageSize = 1000
	}

	db := s.db.WithContext(ctx).Model(&models.Order{})
	if req.Msg.CashierId != 0 {
		db = db.Where("cashier_id = ?", req.Msg.CashierId)
	}
	if req.Msg.StatusFilter != transactionv1.OrderStatus_ORDER_STATUS_UNSPECIFIED {
		db = db.Where("status = ?", int32(req.Msg.StatusFilter))
	}
	if req.Msg.TableId != 0 {
		db = db.Where("table_id = ?", req.Msg.TableId)
	}
	if req.Msg.OrderFromFilter != transactionv1.OrderFrom_ORDER_FROM_UNSPECIFIED {
		db = db.Where("order_from = ?", int32(req.Msg.OrderFromFilter))
	}
	if req.Msg.PaymentStatusFilter != transactionv1.PaymentStatus_PAYMENT_STATUS_UNSPECIFIED {
		db = db.Where("payment_status = ?", int32(req.Msg.PaymentStatusFilter))
	}
	if req.Msg.CreatedAtFrom != nil {
		db = db.Where("created_at >= ?", req.Msg.CreatedAtFrom.AsTime())
	}
	if req.Msg.CreatedAtTo != nil {
		db = db.Where("created_at <= ?", req.Msg.CreatedAtTo.AsTime())
	}
	if req.Msg.Search != "" {
		db = db.Where("customer_name ILIKE ? OR CAST(id AS TEXT) = ?", "%"+req.Msg.Search+"%", req.Msg.Search)
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
