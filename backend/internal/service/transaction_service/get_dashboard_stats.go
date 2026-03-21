package transaction_service

import (
	"context"
	"time"

	"connectrpc.com/connect"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) GetDashboardStats(
	ctx context.Context,
	req *connect.Request[transactionv1.GetDashboardStatsRequest],
) (*connect.Response[transactionv1.GetDashboardStatsResponse], error) {
	now := time.Now()
	var start time.Time
	switch req.Msg.Period {
	case transactionv1.DashboardPeriod_DASHBOARD_PERIOD_THIS_WEEK:
		start = now.Add(-7 * 24 * time.Hour)
	case transactionv1.DashboardPeriod_DASHBOARD_PERIOD_THIS_MONTH:
		start = now.Add(-30 * 24 * time.Hour)
	default: // TODAY or unspecified
		start = now.Add(-24 * time.Hour)
	}

	db := s.db.WithContext(ctx)

	// 1. Revenue — paid orders only
	var revenue int64
	if err := db.Model(&models.Order{}).
		Where("created_at >= ? AND payment_status = ?", start, paymentPaid).
		Select("COALESCE(SUM(total_cents), 0)").Scan(&revenue).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// 2. Order counts by status
	type statusRow struct {
		Status int32
		Count  int32
	}
	var statusRows []statusRow
	if err := db.Model(&models.Order{}).
		Where("created_at >= ?", start).
		Select("status, COUNT(*)::int AS count").
		Group("status").Scan(&statusRows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	counts := &transactionv1.DashboardOrderCounts{}
	for _, r := range statusRows {
		counts.Total += r.Count
		switch r.Status {
		case statusPending:
			counts.Pending = r.Count
		case statusPrepared:
			counts.Prepared = r.Count
		case statusDelivered:
			counts.Delivered = r.Count
		case statusCancelled:
			counts.Cancelled = r.Count
		}
	}

	// 3. Top 5 products (exclude cancelled orders)
	type topRow struct {
		ProductName  string
		QuantitySold int32
		RevenueCents int64
	}
	var topRows []topRow
	if err := db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.created_at >= ? AND orders.status != ?", start, statusCancelled).
		Select("order_items.product_name, SUM(order_items.quantity)::int AS quantity_sold, SUM(order_items.subtotal_cents) AS revenue_cents").
		Group("order_items.product_name").
		Order("quantity_sold DESC").
		Limit(5).Scan(&topRows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	topProducts := make([]*transactionv1.DashboardTopProduct, len(topRows))
	for i, r := range topRows {
		topProducts[i] = &transactionv1.DashboardTopProduct{
			ProductName:  r.ProductName,
			QuantitySold: r.QuantitySold,
			RevenueCents: r.RevenueCents,
		}
	}

	// 4. Recent 5 orders (any status)
	var recentOrders []models.Order
	if err := db.Preload("Items").Order("created_at DESC").Limit(5).Find(&recentOrders).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	recentProto := make([]*transactionv1.Order, len(recentOrders))
	for i := range recentOrders {
		recentProto[i] = toProtoOrder(&recentOrders[i])
	}

	// 5. Payment breakdown by method (paid orders only)
	type paymentRow struct {
		PaymentMethod int32
		Revenue       int64
	}
	var paymentRows []paymentRow
	if err := db.Model(&models.Order{}).
		Where("created_at >= ? AND payment_status = ?", start, paymentPaid).
		Select("payment_method, COALESCE(SUM(total_cents), 0) AS revenue").
		Group("payment_method").Scan(&paymentRows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	breakdown := &transactionv1.DashboardPaymentBreakdown{}
	for _, r := range paymentRows {
		switch transactionv1.PaymentMethod(r.PaymentMethod) {
		case transactionv1.PaymentMethod_PAYMENT_METHOD_CASH:
			breakdown.CashCents = r.Revenue
		case transactionv1.PaymentMethod_PAYMENT_METHOD_MIDTRANS:
			breakdown.MidtransCents = r.Revenue
		case transactionv1.PaymentMethod_PAYMENT_METHOD_MANUAL_QRIS:
			breakdown.ManualQrisCents = r.Revenue
		case transactionv1.PaymentMethod_PAYMENT_METHOD_MANUAL_TRANSFER:
			breakdown.ManualTransferCents = r.Revenue
		}
	}

	// 6. Total change given out (cash paid orders in period)
	var totalChange int64
	if err := db.Model(&models.Order{}).
		Where("created_at >= ? AND payment_status = ? AND payment_method = ? AND change_cents IS NOT NULL",
			start, paymentPaid, int32(transactionv1.PaymentMethod_PAYMENT_METHOD_CASH)).
		Select("COALESCE(SUM(change_cents), 0)").Scan(&totalChange).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	breakdown.CashChangeTotalCents = totalChange

	return connect.NewResponse(&transactionv1.GetDashboardStatsResponse{
		TotalRevenueCents: revenue,
		OrderCounts:       counts,
		TopProducts:       topProducts,
		RecentOrders:      recentProto,
		PaymentBreakdown:  breakdown,
	}), nil
}
