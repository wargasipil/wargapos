package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
)

func (s *TransactionService) GetOrder(
	ctx context.Context,
	req *connect.Request[transactionv1.GetOrderRequest],
) (*connect.Response[transactionv1.GetOrderResponse], error) {
	if req.Msg.OrderId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("order_id is required"))
	}

	order, err := s.loadOrder(ctx, req.Msg.OrderId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&transactionv1.GetOrderResponse{Order: toProtoOrder(order)}), nil
}
