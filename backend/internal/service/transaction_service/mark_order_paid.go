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
	if order.Status != "pending" {
		return nil, connect.NewError(connect.CodeFailedPrecondition, errors.New("order is not pending"))
	}

	method := "cash"
	if err := s.db.WithContext(ctx).Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]any{
		"status":         "paid",
		"payment_method": method,
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	order.Status = "paid"
	order.PaymentMethod = &method

	return connect.NewResponse(&transactionv1.MarkOrderPaidResponse{Order: toProtoOrder(order)}), nil
}
