package stock_core

import (
	"context"
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
	"wargapos/backend/pkgs/runner"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SkuStockAddPayload struct {
	SkuId         uint32
	TransactionId uint64
	UserId        uint32
	Total         float64
	Qty           int32
	CreatedAt     time.Time
}

func SkuStockAdd(ctx context.Context, db *gorm.DB, pay *SkuStockAddPayload) ([]*stockv1.LogEvent, error) {
	var err error
	var stockLogs []*stockv1.LogEvent = []*stockv1.LogEvent{}

	err = db.Transaction(func(tx *gorm.DB) error {
		var sku stock_model.Sku
		var costVersion stock_model.CostVersion
		var stockLog stock_model.StockLog

		caller := runner.NewChainParam(
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // getting sku
					err = tx.
						Clauses(clause.Locking{
							Strength: "UPDATE",
						}).
						Model(&stock_model.Sku{}).
						First(&sku, pay.SkuId).
						Error

					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // costing
					var unitCost float64 = pay.Total / float64(pay.Qty)
					costVersion = stock_model.CostVersion{
						SkuId:         pay.SkuId,
						TransactionId: pay.TransactionId,
						CreatedAt:     pay.CreatedAt,
						UnitCost:      unitCost,
						StockInitiate: pay.Qty,
						LeftStock:     pay.Qty,
					}

					err = tx.
						Create(&costVersion).
						Error
					if err != nil {
						return ctx, err
					}

					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // writing log
					stockLog = stock_model.StockLog{
						SkuID:         pay.SkuId,
						TransactionID: pay.TransactionId,
						Change:        int32(pay.Qty),
						ActorID:       pay.UserId,
						LogType:       stockv1.LogType_LOG_TYPE_STOCK_IN,
						CostVersionID: costVersion.ID,
						CreatedAt:     pay.CreatedAt,
					}

					err = tx.
						Create(&stockLog).
						Error
					if err != nil {
						return ctx, err
					}

					stockLogs = append(stockLogs, &stockv1.LogEvent{
						Log: &stockv1.StockLog{
							Id:            stockLog.ID,
							SkuId:         pay.SkuId,
							TransactionId: pay.TransactionId,
							ActorId:       pay.UserId,
							CostVersionId: costVersion.ID,
							CreatedAt:     timestamppb.New(pay.CreatedAt),
							LogType:       stockv1.LogType_LOG_TYPE_STOCK_IN,
							Change:        pay.Qty,
						},
						Cost: &stockv1.CostVersion{
							Id:            costVersion.ID,
							SkuId:         pay.SkuId,
							TransactionId: pay.TransactionId,
							CreatedAt:     timestamppb.New(costVersion.CreatedAt),
							UpdatedAt:     timestamppb.New(costVersion.UpdatedAt),
							UnitCost:      costVersion.UnitCost,
							StockInitiate: costVersion.StockInitiate,
							LeftStock:     costVersion.LeftStock,
						},
					})
					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // update sku last in + stock_qty
					err = tx.
						Model(&stock_model.Sku{}).
						Where("id = ?", sku.ID).
						Updates(map[string]any{
							"last_stock_in": pay.CreatedAt,
							"stock_qty":     gorm.Expr("stock_qty + ?", pay.Qty),
						}).
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

	return stockLogs, err
}
