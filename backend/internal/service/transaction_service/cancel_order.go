package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) CancelOrder(
	ctx context.Context,
	req *connect.Request[transactionv1.CancelOrderRequest],
) (*connect.Response[transactionv1.CancelOrderResponse], error) {
	var err error
	if req.Msg.OrderId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("order_id is required"))
	}

	order, err := s.loadOrder(ctx, req.Msg.OrderId)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("order not found"))
	}
	if order.Status != statusPending && order.Status != statusPrepared && order.Status != statusDelivered {
		return nil, connect.NewError(connect.CodeFailedPrecondition, errors.New("only pending, prepared, or delivered orders can be cancelled"))
	}

	if err := s.db.WithContext(ctx).Model(&models.Order{}).Where("id = ?", order.ID).Update("status", statusCancelled).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	order.Status = statusCancelled

	_, err = s.Push(ctx, connect.NewRequest(&transactionv1.PushRequest{
		Event: &transactionv1.Event{
			Event: &transactionv1.Event_UpdateOrder{
				UpdateOrder: &transactionv1.UpdateOrderEvent{OrderId: order.ID},
			},
		},
	}))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&transactionv1.CancelOrderResponse{Order: toProtoOrder(order)}), nil
}
