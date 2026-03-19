package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) MarkOrderPaid(
	ctx context.Context,
	req *connect.Request[transactionv1.MarkOrderPaidRequest],
) (*connect.Response[transactionv1.MarkOrderPaidResponse], error) {
	if req.Msg.OrderId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("order_id is required"))
	}

	order, err := s.loadOrder(ctx, req.Msg.OrderId)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("order not found"))
	}
	if order.Status == statusCancelled {
		return nil, connect.NewError(connect.CodeFailedPrecondition, errors.New("order is cancelled"))
	}

	if err := s.db.WithContext(ctx).Model(&models.Order{}).Where("id = ?", order.ID).Update("payment_status", paymentPaid).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	order.PaymentStatus = paymentPaid

	_, err = s.Push(ctx, connect.NewRequest(&transactionv1.PushRequest{
		Event: &transactionv1.Event{Event: &transactionv1.Event_UpdateOrder{
			UpdateOrder: &transactionv1.UpdateOrderEvent{OrderId: order.ID},
		}},
	}))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&transactionv1.MarkOrderPaidResponse{Order: toProtoOrder(order)}), nil
}
