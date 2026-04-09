package marketplace_service

import (
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/models"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

type MarketplaceService struct {
	cfg      *config.Config
	db       *gorm.DB
	stockSrv stockv1connect.StockServiceClient
}

func NewMarketplaceService(cfg *config.Config, db *gorm.DB, stockSrv stockv1connect.StockServiceClient) *MarketplaceService {
	return &MarketplaceService{cfg: cfg, db: db, stockSrv: stockSrv}
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
	var leftStock int32
	var stockValuation float64
	whs := make([]*marketplacev1.WarehouseStock, 0, len(p.Stocks))
	for _, s := range p.Stocks {
		leftStock += s.LeftStock
		stockValuation += s.StockValuation
		whs = append(whs, &marketplacev1.WarehouseStock{
			WarehouseId:    s.WarehouseID,
			SkuId:          s.SkuID,
			LeftStock:      s.LeftStock,
			StockValuation: s.StockValuation,
		})
	}
	return &marketplacev1.MarketplaceProduct{
		Id:             p.ID,
		Name:           p.Name,
		Description:    p.Description,
		PriceCents:     p.PriceCents,
		ImageUrl:       p.ImageURL,
		IsActive:       p.IsActive,
		LeftStock:      leftStock,
		StockValuation: stockValuation,
		WarehouseStock: whs,
		CreatedAt:      timestamppb.New(p.CreatedAt),
		UpdatedAt:      timestamppb.New(p.UpdatedAt),
	}
}
