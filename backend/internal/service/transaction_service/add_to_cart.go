package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) AddToCart(
	ctx context.Context,
	req *connect.Request[transactionv1.AddToCartRequest],
) (*connect.Response[transactionv1.AddToCartResponse], error) {
	if req.Msg.SessionId == "" || req.Msg.ProductId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session_id and product_id are required"))
	}
	if req.Msg.Quantity <= 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("quantity must be positive"))
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Find or create the pending order identified by session_token.
		var order models.Order
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&order, "session_token = ? AND status = ?", req.Msg.SessionId, statusPending).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			token := req.Msg.SessionId
			order = models.Order{SessionToken: &token, Status: statusPending}
			if req.Msg.TableId != 0 {
				tableID := req.Msg.TableId
				order.TableID = &tableID
			}
			if err := tx.Create(&order).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		}

		// Look up the product.
		var product models.Product
		if err := tx.First(&product, "id = ? AND is_active = true", req.Msg.ProductId).Error; err != nil {
			return err
		}

		// Upsert the order item.
		productID := req.Msg.ProductId
		var item models.OrderItem
		err = tx.First(&item, "order_id = ? AND product_id = ?", order.ID, req.Msg.ProductId).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			item = models.OrderItem{
				OrderID:        order.ID,
				ProductID:      &productID,
				ProductName:    product.Name,
				Quantity:       req.Msg.Quantity,
				UnitPriceCents: product.PriceCents,
				SubtotalCents:  product.PriceCents * int64(req.Msg.Quantity),
			}
			if req.Msg.Notes != "" {
				n := req.Msg.Notes
				item.Notes = &n
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			newQty := item.Quantity + req.Msg.Quantity
			updates := map[string]any{
				"quantity":       newQty,
				"subtotal_cents": item.UnitPriceCents * int64(newQty),
			}
			if req.Msg.Notes != "" {
				updates["notes"] = req.Msg.Notes
			}
			if err := tx.Model(&item).Updates(updates).Error; err != nil {
				return err
			}
		}

		return s.recalcTotal(tx, order.ID)
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	order, err := s.loadOrderBySession(ctx, req.Msg.SessionId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&transactionv1.AddToCartResponse{Cart: toProtoOrder(order)}), nil
}
