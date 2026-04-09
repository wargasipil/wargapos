package marketplace_order_service

import (
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/models"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

type MarketplaceOrderService struct {
	cfg      *config.Config
	db       *gorm.DB
	stockSrv stockv1connect.StockServiceClient
}

func NewMarketplaceOrderService(cfg *config.Config, db *gorm.DB, stockSrv stockv1connect.StockServiceClient) *MarketplaceOrderService {
	return &MarketplaceOrderService{cfg: cfg, db: db, stockSrv: stockSrv}
}

func toOrderProto(o models.MarketplaceOrder) *marketplacev1.MarketplaceOrder {
	items := make([]*marketplacev1.MarketplaceOrderItem, len(o.Items))
	for i, it := range o.Items {
		items[i] = &marketplacev1.MarketplaceOrderItem{
			Id:             it.ID,
			ItemName:       it.ItemName,
			Quantity:       it.Quantity,
			UnitPriceCents: it.UnitPriceCents,
			SubtotalCents:  it.SubtotalCents,
		}
	}
	return &marketplacev1.MarketplaceOrder{
		Id:                 o.ID,
		ShopId:             o.ShopID,
		ShopName:           o.Shop.Name,
		CustomerName:       o.CustomerName,
		PhoneNumber:        o.PhoneNumber,
		Items:              items,
		TotalCents:         o.TotalCents,
		Status:             o.Status,
		WarehouseId:        o.WarehouseID,
		CustomerId:         o.CustomerID,
		AddressId:          o.AddressID,
		ShippingLabel:      o.ShippingLabel,
		ShippingAddress:    o.ShippingAddress,
		ShippingCity:       o.ShippingCity,
		ShippingProvince:   o.ShippingProvince,
		ShippingPostalCode: o.ShippingPostalCode,
		Note:               o.Note,
		Receipt:            o.Receipt,
		ReceiptFile:        o.ReceiptFile,
		CreatedAt:          timestamppb.New(o.CreatedAt),
		UpdatedAt:          timestamppb.New(o.UpdatedAt),
	}
}

func toAddressProto(a models.MarketplaceCustomerAddress) *marketplacev1.CustomerAddress {
	return &marketplacev1.CustomerAddress{
		Id:         a.ID,
		CustomerId: a.CustomerID,
		Label:      a.Label,
		Address:    a.Address,
		City:       a.City,
		Province:   a.Province,
		PostalCode: a.PostalCode,
		CreatedAt:  timestamppb.New(a.CreatedAt),
		UpdatedAt:  timestamppb.New(a.UpdatedAt),
	}
}

func toCustomerProto(c models.MarketplaceCustomer) *marketplacev1.MarketplaceCustomer {
	return &marketplacev1.MarketplaceCustomer{
		Id:          c.ID,
		Name:        c.Name,
		PhoneNumber: c.PhoneNumber,
		CreatedAt:   timestamppb.New(c.CreatedAt),
		UpdatedAt:   timestamppb.New(c.UpdatedAt),
	}
}
