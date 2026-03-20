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

	f := req.Msg.GetFilter()
	if f == nil {
		f = &transactionv1.ListOrdersFilter{}
	}

	db := s.db.WithContext(ctx).Model(&models.Order{})
	if f.CashierId != 0 {
		db = db.Where("cashier_id = ?", f.CashierId)
	}
	if f.StatusFilter != transactionv1.OrderStatus_ORDER_STATUS_UNSPECIFIED {
		db = db.Where("status = ?", int32(f.StatusFilter))
	}
	if f.TableId != 0 {
		db = db.Where("table_id = ?", f.TableId)
	}
	if f.OrderFromFilter != transactionv1.OrderFrom_ORDER_FROM_UNSPECIFIED {
		db = db.Where("order_from = ?", int32(f.OrderFromFilter))
	}
	if f.PaymentStatusFilter != transactionv1.PaymentStatus_PAYMENT_STATUS_UNSPECIFIED {
		db = db.Where("payment_status = ?", int32(f.PaymentStatusFilter))
	}
	if f.CreatedAtFrom != nil {
		db = db.Where("created_at >= ?", f.CreatedAtFrom.AsTime())
	}
	if f.CreatedAtTo != nil {
		db = db.Where("created_at <= ?", f.CreatedAtTo.AsTime())
	}
	if f.Search != "" {
		db = db.Where("customer_name ILIKE ? OR CAST(id AS TEXT) = ?", "%"+f.Search+"%", f.Search)
	}
	if f.PaymentMethodFilter != transactionv1.PaymentMethod_PAYMENT_METHOD_UNSPECIFIED {
		db = db.Where("payment_method = ?", int32(f.PaymentMethodFilter))
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	orderClause := "created_at DESC"
	if s := req.Msg.GetSort(); s != nil {
		col := "created_at"
		if s.SortBy == transactionv1.LostOrdersSort_SORT_BY_ORDERID {
			col = "id"
		}
		dir := "DESC"
		if !s.Descending {
			dir = "ASC"
		}
		orderClause = col + " " + dir
	}

	var orders []models.Order
	if err := db.Preload("Items").
		Order(orderClause).
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
