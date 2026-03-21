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

	updates := map[string]any{"payment_status": paymentPaid}
	if order.PaymentMethod != nil &&
		*order.PaymentMethod == int32(transactionv1.PaymentMethod_PAYMENT_METHOD_CASH) {
		tendered := req.Msg.CashTenderedCents
		if tendered > 0 && tendered < order.TotalCents {
			return nil, connect.NewError(connect.CodeInvalidArgument,
				errors.New("cash tendered is less than the order total"))
		}
		if tendered > 0 {
			updates["cash_tendered_cents"] = tendered
			updates["change_cents"] = tendered - order.TotalCents
		}
	}
	if err := s.db.WithContext(ctx).Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	order.PaymentStatus = paymentPaid
	if v, ok := updates["cash_tendered_cents"]; ok {
		c := v.(int64)
		ch := updates["change_cents"].(int64)
		order.CashTenderedCents = &c
		order.ChangeCents = &ch
	}

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
