package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) DetailTransaction(
	ctx context.Context,
	req *connect.Request[stockv1.DetailTransactionRequest],
) (*connect.Response[stockv1.DetailTransactionResponse], error) {
	var t models.StockTransaction
	if err := s.db.WithContext(ctx).Preload("Items").
		First(&t, req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("transaction not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.DetailTransactionResponse{
		Transaction: toProtoTransaction(&t),
	}), nil
}
