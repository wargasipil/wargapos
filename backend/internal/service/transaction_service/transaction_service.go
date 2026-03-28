package transaction_service

import (
	"context"
	"errors"
	"strconv"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/models"
)

var ErrCartEmpty = errors.New("cart has no items")
var ErrCartNotPending = errors.New("cart is not in pending state")

// Package-level status constants for use across all handlers.
const (
	statusPending   = int32(transactionv1.OrderStatus_ORDER_STATUS_PENDING)
	statusPrepared  = int32(transactionv1.OrderStatus_ORDER_STATUS_PREPARED)
	statusDelivered = int32(transactionv1.OrderStatus_ORDER_STATUS_DELIVERED)
	statusCancelled = int32(transactionv1.OrderStatus_ORDER_STATUS_CANCELLED)

	paymentUnpaid   = int32(transactionv1.PaymentStatus_PAYMENT_STATUS_UNPAID)
	paymentPaid     = int32(transactionv1.PaymentStatus_PAYMENT_STATUS_PAID)
	paymentRefunded = int32(transactionv1.PaymentStatus_PAYMENT_STATUS_REFUNDED)
)

var _ = paymentRefunded // suppress unused warning

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
		First(&order, "session_token = ? AND status = ?", sessionToken, statusPending).Error; err != nil {
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

	var cashierID uint32
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

	var pm transactionv1.PaymentMethod
	if o.PaymentMethod != nil {
		pm = transactionv1.PaymentMethod(*o.PaymentMethod)
	}

	var cashTenderedCents int64
	if o.CashTenderedCents != nil {
		cashTenderedCents = *o.CashTenderedCents
	}
	var changeCents int64
	if o.ChangeCents != nil {
		changeCents = *o.ChangeCents
	}

	return &transactionv1.Order{
		Id:                o.ID,
		CashierId:         cashierID,
		Items:             items,
		TotalCents:        o.TotalCents,
		Status:            transactionv1.OrderStatus(o.Status),
		CreatedAt:         timestamppb.New(o.CreatedAt),
		TableId:           tableID,
		CustomerName:      customerName,
		PhoneNumber:       phoneNumber,
		PaymentMethod:     pm,
		OrderFrom:         transactionv1.OrderFrom(o.OrderFrom),
		PaymentStatus:     transactionv1.PaymentStatus(o.PaymentStatus),
		CashTenderedCents: cashTenderedCents,
		ChangeCents:       changeCents,
	}
}

// midtransOrderID converts an int64 order ID to the string format Midtrans requires.
func midtransOrderID(id int64) string {
	return strconv.FormatInt(id, 10)
}
