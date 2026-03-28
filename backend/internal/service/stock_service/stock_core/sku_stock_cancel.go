package stock_core

import (
	"context"
	"fmt"
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service/stock_model"
	"wargapos/backend/pkgs/runner"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SkuStockCancelPayload struct {
	TransactionId uint64
	SkuId         uint32
	UserId        uint32
	// CreatedAt     time.Time
}

func SkuStockCancel(ctx context.Context, db *gorm.DB, pay *SkuStockCancelPayload) error {
	var err error
	var sku models.Sku
	var priceVersion stock_model.PriceVersion
	var stock stock_model.Stock
	var stockLog stock_model.StockLog

	err = db.Transaction(func(tx *gorm.DB) error {
		caller := runner.NewChainParam(
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // locking sku
					err = tx.
						Clauses(clause.Locking{
							Strength: "UPDATE",
						}).
						Model(&models.Sku{}).
						First(&sku, pay.SkuId).
						Error

					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // getting price version dan stock
					err = tx.
						Model(&stock_model.PriceVersion{}).
						Where("transaction_id = ?", pay.TransactionId).
						Where("sku_id = ?", pay.SkuId).
						Limit(1).
						Find(&priceVersion).
						Error

					if err != nil {
						return ctx, err
					}

					err = tx.
						Model(&stock_model.Stock{}).
						Where("transaction_id = ?", pay.TransactionId).
						Where("sku_id = ?", pay.SkuId).
						Limit(1).
						Find(&stock).
						Error

					if err != nil {
						return ctx, err
					}

					if priceVersion.ID == 0 {
						return ctx, fmt.Errorf("skuId %d priceversion not found", sku.ID)
					}

					if stock.ID == 0 {
						return ctx, fmt.Errorf("skuId %d stock not found", sku.ID)
					}

					if priceVersion.StockInitiate != priceVersion.LeftStock {
						return ctx, fmt.Errorf("price stock already use and cannot canceling %d", priceVersion.SkuId)
					}

					if stock.StockInitiate != stock.LeftStock {
						return ctx, fmt.Errorf("stock already use and cannot canceling %d", stock.SkuID)
					}

					if stock.LeftStock != priceVersion.LeftStock {
						return ctx, fmt.Errorf("price version and sku stock not matched %d", sku.ID)
					}

					return next(ctx)

				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // canceling price and stock
					priceVersion.LeftStock = 0
					stock.LeftStock = 0

					err = tx.Save(&priceVersion).Error
					if err != nil {
						return ctx, err
					}
					err = tx.Save(&stock).Error
					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(data context.Context) (context.Context, error) { // creating log
					stockLog = stock_model.StockLog{
						SkuID:          pay.SkuId,
						TransactionID:  pay.TransactionId,
						Change:         -stock.StockInitiate,
						PriceVersionID: priceVersion.ID,
						StockID:        stock.ID,
						ActorID:        pay.UserId,
						LogType:        stockv1.LogType_LOG_TYPE_STOCK_CANCEL,
						CreatedAt:      time.Now(),
					}

					err = tx.
						Create(&stockLog).
						Error
					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // decrement sku stock_qty
					err = tx.
						Model(&models.Sku{}).
						Where("id = ?", sku.ID).
						Update("stock_qty", gorm.Expr("stock_qty - ?", stock.StockInitiate)).
						Error

					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
		)
		_, err = caller(ctx)
		return err
	})

	return err

}
