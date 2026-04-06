package marketplace_service

import (
	"context"
	"fmt"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
	"gorm.io/gorm"
)

func (s *MarketplaceService) CreateOrder(ctx context.Context, req *connect.Request[marketplacev1.CreateOrderRequest]) (*connect.Response[marketplacev1.CreateOrderResponse], error) {
	if len(req.Msg.Items) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("items required"))
	}
	if req.Msg.AddressId == 0 && req.Msg.ShippingAddress == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("address or shipping fields required"))
	}

	var shop models.MarketplaceShop
	if err := s.db.WithContext(ctx).First(&shop, req.Msg.ShopId).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	order := models.MarketplaceOrder{
		ShopID:       req.Msg.ShopId,
		CustomerName: req.Msg.CustomerName,
		PhoneNumber:  req.Msg.PhoneNumber,
		Status:       marketplacev1.MarketplaceOrderStatus_MARKETPLACE_ORDER_STATUS_PENDING,
		WarehouseID:  req.Msg.WarehouseId,
		CustomerID:   req.Msg.CustomerId,
		Note:         req.Msg.Note,
		Receipt:      req.Msg.Receipt,
		ReceiptFile:  req.Msg.ReceiptFile,
	}

	if req.Msg.AddressId > 0 {
		var addr models.MarketplaceCustomerAddress
		if err := s.db.WithContext(ctx).Where("id = ? AND deleted = false", req.Msg.AddressId).First(&addr).Error; err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("address not found"))
		}
		order.AddressID = addr.ID
		order.ShippingLabel = addr.Label
		order.ShippingAddress = addr.Address
		order.ShippingCity = addr.City
		order.ShippingProvince = addr.Province
		order.ShippingPostalCode = addr.PostalCode
	} else {
		order.ShippingLabel = req.Msg.ShippingLabel
		order.ShippingAddress = req.Msg.ShippingAddress
		order.ShippingCity = req.Msg.ShippingCity
		order.ShippingProvince = req.Msg.ShippingProvince
		order.ShippingPostalCode = req.Msg.ShippingPostalCode
	}

	var total int64
	items := make([]models.MarketplaceOrderItem, len(req.Msg.Items))
	for i, it := range req.Msg.Items {
		subtotal := int64(it.Quantity) * it.UnitPriceCents
		total += subtotal
		items[i] = models.MarketplaceOrderItem{
			ItemName:       it.ItemName,
			Quantity:       it.Quantity,
			UnitPriceCents: it.UnitPriceCents,
			SubtotalCents:  subtotal,
		}
	}
	order.TotalCents = total

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
		}
		return tx.Create(&items).Error
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	order.Shop = shop
	order.Items = items
	return connect.NewResponse(&marketplacev1.CreateOrderResponse{
		Order: toOrderProto(order),
	}), nil
}
