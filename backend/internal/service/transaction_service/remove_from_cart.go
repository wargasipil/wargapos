package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) RemoveFromCart(
	ctx context.Context,
	req *connect.Request[transactionv1.RemoveFromCartRequest],
) (*connect.Response[transactionv1.RemoveFromCartResponse], error) {
	if req.Msg.SessionId == "" || req.Msg.ProductId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session_id and product_id are required"))
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Delete(&models.OrderItem{}, "order_id = ? AND product_id = ?", req.Msg.SessionId, req.Msg.ProductId)
		if result.Error != nil {
			return result.Error
		}
		return s.recalcTotal(tx, req.Msg.SessionId)
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	order, err := s.loadOrder(ctx, req.Msg.SessionId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&transactionv1.RemoveFromCartResponse{Cart: toProtoOrder(order)}), nil
}
