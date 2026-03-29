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

type PriceProvision struct {
	Qty     int32
	PriceId uint64
}

type SkuStockProvisionPayload struct {
	SkuId       uint32
	UserId      uint32
	Qty         int32
	CostingType stockv1.CostingType
}

func SkuStockProvision(ctx context.Context, tx *gorm.DB, pay *SkuStockProvisionPayload) ([]PriceProvision, runner.NextFuncParam[uint64], error) {
	var err error
	var sku models.Sku
	var priceProvision []PriceProvision

	caller := runner.NewChainParam(
		func(next runner.NextFuncParam[*gorm.DB]) runner.NextFuncParam[*gorm.DB] {
			return func(tx *gorm.DB) (*gorm.DB, error) { // locking sku
				err = tx.
					Clauses(clause.Locking{
						Strength: "UPDATE",
					}).
					Model(&models.Sku{}).
					First(&sku, pay.SkuId).
					Error

				if err != nil {
					return tx, err
				}

				return next(tx)
			}
		},
		func(next runner.NextFuncParam[*gorm.DB]) runner.NextFuncParam[*gorm.DB] {
			return func(tx *gorm.DB) (*gorm.DB, error) { // provisioning cost versions
				query := tx.
					Model(&stock_model.CostVersion{}).
					Where("sku_id = ?", pay.SkuId).
					Where("left_stock > ?", 0)

				switch pay.CostingType {
				case stockv1.CostingType_COSTING_TYPE_FIFO:
					query = query.Order("created_at asc")
				case stockv1.CostingType_COSTING_TYPE_LIFO:
					query = query.Order("created_at desc")
				case stockv1.CostingType_COSTING_TYPE_MAX_PRICE:
					query = query.Order("unit_cost desc")
				case stockv1.CostingType_COSTING_TYPE_MIN_PRICE:
					query = query.Order("unit_cost asc")
				default:
					return tx, fmt.Errorf("%s not implemented", stockv1.CostingType_name[int32(pay.CostingType)])
				}

				rows, err := query.Rows()
				if err != nil {
					return tx, err
				}
				defer rows.Close()

				var needQty int32 = pay.Qty
				var delta int32
				var cost stock_model.CostVersion

				for rows.Next() {
					if needQty == 0 {
						break
					}

					err = tx.ScanRows(rows, &cost)
					if err != nil {
						return tx, err
					}

					if cost.LeftStock >= needQty {
						delta = needQty
					} else {
						delta = cost.LeftStock
					}

					needQty -= delta

					priceProvision = append(priceProvision, PriceProvision{
						Qty:     delta,
						PriceId: cost.ID,
					})
				}

				if needQty != 0 {
					return tx, fmt.Errorf("sku %d insuffient", sku.ID)
				}

				return next(tx)
			}
		},
	)

	// running provisioning
	_, err = caller(tx)

	commited := runner.NewChainParam(
		func(next runner.NextFuncParam[uint64]) runner.NextFuncParam[uint64] {
			return func(txId uint64) (uint64, error) { // stock log
				var err error
				var stockLog stock_model.StockLog
				for _, price := range priceProvision {
					stockLog = stock_model.StockLog{
						SkuID:         pay.SkuId,
						TransactionID: txId,
						Change:        -price.Qty,
						LogType:       stockv1.LogType_LOG_TYPE_ORDER,
						ActorID:       pay.UserId,
						CostVersionID: price.PriceId,
						CreatedAt:     time.Now(),
					}

					err = tx.Create(&stockLog).Error
					if err != nil {
						return txId, err
					}
				}

				return next(txId)
			}
		},
		func(next runner.NextFuncParam[uint64]) runner.NextFuncParam[uint64] {
			return func(txId uint64) (uint64, error) { // delta in cost version
				var err error
				for _, price := range priceProvision {
					err = tx.
						Model(&stock_model.CostVersion{}).
						Where("id = ?", price.PriceId).
						Updates(map[string]interface{}{
							"updated_at": time.Now(),
							"left_stock": gorm.Expr("left_stock - ?", price.Qty),
						}).
						Error

					if err != nil {
						return txId, err
					}
				}

				return next(txId)
			}
		},
		func(next runner.NextFuncParam[uint64]) runner.NextFuncParam[uint64] {
			return func(txId uint64) (uint64, error) { // decrement sku stock_qty + last_stock_out
				var totalQty int32
				for _, price := range priceProvision {
					totalQty += price.Qty
				}

				now := time.Now()
				err := tx.
					Model(&models.Sku{}).
					Where("id = ?", pay.SkuId).
					Updates(map[string]interface{}{
						"stock_qty":      gorm.Expr("stock_qty - ?", totalQty),
						"last_stock_out": now,
					}).
					Error

				if err != nil {
					return txId, err
				}

				return next(txId)
			}
		},
	)

	return priceProvision, commited, err
}
