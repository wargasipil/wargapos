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
}

func SkuStockCancel(ctx context.Context, db *gorm.DB, pay *SkuStockCancelPayload) error {
	var err error
	var sku models.Sku
	var costVersion stock_model.CostVersion
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
				return func(ctx context.Context) (context.Context, error) { // getting cost version
					err = tx.
						Model(&stock_model.CostVersion{}).
						Where("transaction_id = ?", pay.TransactionId).
						Where("sku_id = ?", pay.SkuId).
						Limit(1).
						Find(&costVersion).
						Error

					if err != nil {
						return ctx, err
					}

					if costVersion.ID == 0 {
						return ctx, fmt.Errorf("skuId %d cost version not found", sku.ID)
					}

					if costVersion.StockInitiate != costVersion.LeftStock {
						return ctx, fmt.Errorf("cost stock already used, cannot cancel skuId %d", costVersion.SkuId)
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // cancel cost version
					costVersion.LeftStock = 0

					err = tx.Save(&costVersion).Error
					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(data context.Context) (context.Context, error) { // creating log
					stockLog = stock_model.StockLog{
						SkuID:         pay.SkuId,
						TransactionID: pay.TransactionId,
						Change:        -costVersion.StockInitiate,
						ActorID:       pay.UserId,
						LogType:       stockv1.LogType_LOG_TYPE_STOCK_CANCEL,
						CostVersionID: costVersion.ID,
						CreatedAt:     time.Now(),
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
						Update("stock_qty", gorm.Expr("stock_qty - ?", costVersion.StockInitiate)).
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
