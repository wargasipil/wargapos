package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) Checkout(
	ctx context.Context,
	req *connect.Request[transactionv1.CheckoutRequest],
) (*connect.Response[transactionv1.CheckoutResponse], error) {
	if req.Msg.SessionId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session_id is required"))
	}

	var orderID int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Preload("Items").
			First(&order, "session_token = ? AND status = 'pending'", req.Msg.SessionId).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrCartNotPending
			}
			return err
		}
		if len(order.Items) == 0 {
			return ErrCartEmpty
		}
		orderID = order.ID

		updates := map[string]any{
			"status":         "paid",
			"payment_method": paymentMethodToString(req.Msg.PaymentMethod),
		}
		if req.Msg.CashierId != 0 {
			updates["cashier_id"] = req.Msg.CashierId
		}
		if req.Msg.CustomerName != "" {
			updates["customer_name"] = req.Msg.CustomerName
		}
		if req.Msg.PhoneNumber != "" {
			updates["phone_number"] = req.Msg.PhoneNumber
		}
		if req.Msg.OrderFrom != transactionv1.OrderFrom_ORDER_FROM_UNSPECIFIED {
			updates["order_from"] = int32(req.Msg.OrderFrom)
		}
		return tx.Model(&order).Updates(updates).Error
	})
	if err != nil {
		if errors.Is(err, ErrCartNotPending) || errors.Is(err, ErrCartEmpty) {
			return nil, connect.NewError(connect.CodeFailedPrecondition, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	order, err := s.loadOrder(ctx, orderID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&transactionv1.CheckoutResponse{Order: toProtoOrder(order)}), nil
}
