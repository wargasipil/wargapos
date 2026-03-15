package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) MarkOrderReady(
	ctx context.Context,
	req *connect.Request[transactionv1.MarkOrderReadyRequest],
) (*connect.Response[transactionv1.MarkOrderReadyResponse], error) {
	if req.Msg.OrderId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("order_id is required"))
	}

	order, err := s.loadOrder(ctx, req.Msg.OrderId)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("order not found"))
	}
	if order.Status != statusPending {
		return nil, connect.NewError(connect.CodeFailedPrecondition, errors.New("order is not pending"))
	}

	if err := s.db.WithContext(ctx).Model(&models.Order{}).Where("id = ?", order.ID).Update("status", statusReady).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	order.Status = statusReady

	return connect.NewResponse(&transactionv1.MarkOrderReadyResponse{Order: toProtoOrder(order)}), nil
}
