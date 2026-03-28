package stock_core

import (
	"context"

	"gorm.io/gorm"
)

type SkuStockProvisionPayload struct {
	SkuId  uint32
	UserId uint32
	Qty    uint32
}

func SkuStockProvision(ctx context.Context, db *gorm.DB, pay *SkuStockProvisionPayload) error {
	var err error
	// var sku models.Sku
	// var priceVersion stock_model.PriceVersion
	// var stock stock_model.Stock
	// var stockLog stock_model.StockLog

	return err
}
