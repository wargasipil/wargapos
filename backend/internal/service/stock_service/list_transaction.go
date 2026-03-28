package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) ListTransaction(
	ctx context.Context,
	req *connect.Request[stockv1.ListTransactionRequest],
) (*connect.Response[stockv1.ListTransactionResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&models.StockTransaction{})
	if req.Msg.TransactionType != stockv1.TransactionType_TRANSACTION_TYPE_UNSPECIFIED {
		q = q.Where("transaction_type = ?", int16(req.Msg.TransactionType))
	}
	if req.Msg.Cancelled {
		q = q.Where("cancelled = true")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var txs []models.StockTransaction
	if err := q.Order("id desc").Limit(pageSize).Offset(offset).Find(&txs).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*stockv1.Transaction, len(txs))
	for i := range txs {
		proto[i] = toProtoTransaction(&txs[i])
	}

	return connect.NewResponse(&stockv1.ListTransactionResponse{
		Transactions: proto,
		Total:        int32(total),
	}), nil
}
