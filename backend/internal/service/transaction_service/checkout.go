package transaction_service

import (
	"context"
	"errors"
	"fmt"

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
		if err := tx.Model(&order).Updates(updates).Error; err != nil {
			return err
		}

		// Deduct stock for each item.
		for _, item := range order.Items {
			if item.ProductID == nil {
				continue
			}
			res := tx.Model(&models.Product{}).
				Where("id = ? AND stock_qty >= ?", *item.ProductID, item.Quantity).
				Update("stock_qty", gorm.Expr("stock_qty - ?", item.Quantity))
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return fmt.Errorf("insufficient stock for product %d", *item.ProductID)
			}
			mov := &models.StockMovement{
				ProductID: *item.ProductID,
				Delta:     -item.Quantity,
				Reason:    "sale",
				Note:      fmt.Sprintf("Order #%d", order.ID),
			}
			if err := tx.Create(mov).Error; err != nil {
				return err
			}
		}
		return nil
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
