package transaction_service

import (
	"context"
	"errors"
	"strconv"

	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/models"
)

var ErrCartEmpty = errors.New("cart has no items")
var ErrCartNotPending = errors.New("cart is not in pending state")

// TransactionService implements transactionv1connect.TransactionServiceHandler directly.
type TransactionService struct {
	db          *gorm.DB
	midtransCfg config.MidtransConfig
}

// NewTransactionService is the Wire provider constructor.
func NewTransactionService(db *gorm.DB, midtransCfg config.MidtransConfig) *TransactionService {
	return &TransactionService{db: db, midtransCfg: midtransCfg}
}

var _ transactionv1connect.TransactionServiceHandler = (*TransactionService)(nil)

func (s *TransactionService) recalcTotal(tx *gorm.DB, orderID int64) error {
	return tx.Model(&models.Order{}).Where("id = ?", orderID).
		Update("total_cents", tx.Model(&models.OrderItem{}).
			Select("COALESCE(SUM(subtotal_cents), 0)").
			Where("order_id = ?", orderID)).Error
}

// loadOrder loads an order by its integer ID.
func (s *TransactionService) loadOrder(ctx context.Context, orderID int64) (*models.Order, error) {
	var order models.Order
	if err := s.db.WithContext(ctx).Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

// loadOrderBySession loads a pending order by its session_token.
func (s *TransactionService) loadOrderBySession(ctx context.Context, sessionToken string) (*models.Order, error) {
	var order models.Order
	if err := s.db.WithContext(ctx).Preload("Items").
		First(&order, "session_token = ? AND status = 'pending'", sessionToken).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func toProtoOrder(o *models.Order) *transactionv1.Order {
	items := make([]*transactionv1.OrderItem, len(o.Items))
	for i, item := range o.Items {
		var productID int64
		if item.ProductID != nil {
			productID = *item.ProductID
		}
		notes := ""
		if item.Notes != nil {
			notes = *item.Notes
		}
		items[i] = &transactionv1.OrderItem{
			Id:             item.ID,
			ProductId:      productID,
			ProductName:    item.ProductName,
			Quantity:       item.Quantity,
			UnitPriceCents: item.UnitPriceCents,
			SubtotalCents:  item.SubtotalCents,
			Notes:          notes,
		}
	}

	var cashierID int64
	if o.CashierID != nil {
		cashierID = *o.CashierID
	}

	var tableID int64
	if o.TableID != nil {
		tableID = *o.TableID
	}

	customerName := ""
	if o.CustomerName != nil {
		customerName = *o.CustomerName
	}

	phoneNumber := ""
	if o.PhoneNumber != nil {
		phoneNumber = *o.PhoneNumber
	}

	pm := ""
	if o.PaymentMethod != nil {
		pm = *o.PaymentMethod
	}

	return &transactionv1.Order{
		Id:            o.ID,
		CashierId:     cashierID,
		Items:         items,
		TotalCents:    o.TotalCents,
		Status:        stringToOrderStatus(o.Status),
		CreatedAt:     o.CreatedAt.Unix(),
		TableId:       tableID,
		CustomerName:  customerName,
		PhoneNumber:   phoneNumber,
		PaymentMethod: stringToPaymentMethod(pm),
		OrderFrom:     transactionv1.OrderFrom(o.OrderFrom),
	}
}

func stringToPaymentMethod(s string) transactionv1.PaymentMethod {
	switch s {
	case "cash":
		return transactionv1.PaymentMethod_PAYMENT_METHOD_CASH
	case "qris":
		return transactionv1.PaymentMethod_PAYMENT_METHOD_QRIS
	default:
		return transactionv1.PaymentMethod_PAYMENT_METHOD_UNSPECIFIED
	}
}

func paymentMethodToString(m transactionv1.PaymentMethod) string {
	switch m {
	case transactionv1.PaymentMethod_PAYMENT_METHOD_CASH:
		return "cash"
	case transactionv1.PaymentMethod_PAYMENT_METHOD_QRIS:
		return "qris"
	default:
		return ""
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

// midtransOrderID converts an int64 order ID to the string format Midtrans requires.
func midtransOrderID(id int64) string {
	return strconv.FormatInt(id, 10)
}
