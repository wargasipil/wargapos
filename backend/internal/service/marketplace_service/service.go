package marketplace_service

import (
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

type MarketplaceService struct {
	db *gorm.DB
}

func NewMarketplaceService(db *gorm.DB) *MarketplaceService {
	return &MarketplaceService{db: db}
}

func toShopProto(m models.MarketplaceShop) *marketplacev1.MarketplaceShop {
	return &marketplacev1.MarketplaceShop{
		Id:        m.ID,
		Name:      m.Name,
		Type:      m.Type,
		Username:  m.Username,
		Url:       m.URL,
		IsActive:  m.IsActive,
		CreatedAt: timestamppb.New(m.CreatedAt),
		UpdatedAt: timestamppb.New(m.UpdatedAt),
	}
}

func toProductProto(p models.MarketplaceProduct) *marketplacev1.MarketplaceProduct {
	return &marketplacev1.MarketplaceProduct{
		Id:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		PriceCents:  p.PriceCents,
		ImageUrl:    p.ImageURL,
		IsActive:    p.IsActive,
		CreatedAt:   timestamppb.New(p.CreatedAt),
		UpdatedAt:   timestamppb.New(p.UpdatedAt),
	}
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
		Id:           o.ID,
		ShopId:       o.ShopID,
		ShopName:     o.Shop.Name,
		CustomerName: o.CustomerName,
		PhoneNumber:  o.PhoneNumber,
		Items:        items,
		TotalCents:   o.TotalCents,
		Status:       o.Status,
		CreatedAt:    timestamppb.New(o.CreatedAt),
		UpdatedAt:    timestamppb.New(o.UpdatedAt),
	}
}
