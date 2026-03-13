package transaction_service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/internal/models"
)

var ErrCartEmpty = errors.New("cart has no items")
var ErrCartNotPending = errors.New("cart is not in pending state")

// TransactionService implements transactionv1connect.TransactionServiceHandler directly.
type TransactionService struct {
	db *gorm.DB
}

// NewTransactionService is the Wire provider constructor.
func NewTransactionService(db *gorm.DB) *TransactionService {
	return &TransactionService{db: db}
}

var _ transactionv1connect.TransactionServiceHandler = (*TransactionService)(nil)

func (s *TransactionService) recalcTotal(tx *gorm.DB, orderID string) error {
	return tx.Model(&models.Order{}).Where("id = ?", orderID).
		Update("total_cents", tx.Model(&models.OrderItem{}).
			Select("COALESCE(SUM(subtotal_cents), 0)").
			Where("order_id = ?", orderID)).Error
}

func (s *TransactionService) loadOrder(ctx context.Context, orderID string) (*models.Order, error) {
	var order models.Order
	if err := s.db.WithContext(ctx).Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func toProtoOrder(o *models.Order) *transactionv1.Order {
	items := make([]*transactionv1.OrderItem, len(o.Items))
	for i, item := range o.Items {
		productID := ""
		if item.ProductID != nil {
			productID = *item.ProductID
		}
		items[i] = &transactionv1.OrderItem{
			Id:             item.ID,
			ProductId:      productID,
			ProductName:    item.ProductName,
			Quantity:       item.Quantity,
			UnitPriceCents: item.UnitPriceCents,
			SubtotalCents:  item.SubtotalCents,
		}
	}

	cashierID := ""
	if o.CashierID != nil {
		cashierID = *o.CashierID
	}

	return &transactionv1.Order{
		Id:         o.ID,
		CashierId:  cashierID,
		Items:      items,
		TotalCents: o.TotalCents,
		Status:     stringToOrderStatus(o.Status),
		CreatedAt:  o.CreatedAt.Unix(),
	}
}

func stringToOrderStatus(s string) transactionv1.OrderStatus {
	switch s {
	case "pending":
		return transactionv1.OrderStatus_ORDER_STATUS_PENDING
	case "paid":
		return transactionv1.OrderStatus_ORDER_STATUS_PAID
	case "cancelled":
		return transactionv1.OrderStatus_ORDER_STATUS_CANCELLED
	default:
		return transactionv1.OrderStatus_ORDER_STATUS_UNSPECIFIED
	}
}
