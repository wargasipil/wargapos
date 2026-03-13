package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) GetCart(
	ctx context.Context,
	req *connect.Request[transactionv1.GetCartRequest],
) (*connect.Response[transactionv1.GetCartResponse], error) {
	if req.Msg.SessionId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session_id is required"))
	}

	var order models.Order
	if err := s.db.WithContext(ctx).Preload("Items").
		First(&order, "id = ? AND status = 'pending'", req.Msg.SessionId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&transactionv1.GetCartResponse{Cart: toProtoOrder(&order)}), nil
}
