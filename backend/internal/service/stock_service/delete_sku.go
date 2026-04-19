package stock_service

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
	"wargapos/backend/pkgs/runner"
)

func (s *StockService) DeleteSku(
	ctx context.Context,
	req *connect.Request[stockv1.DeleteSkuRequest],
) (*connect.Response[stockv1.DeleteSkuResponse], error) {
	var err error
	err = s.
		db.
		WithContext(ctx).
		Transaction(func(tx *gorm.DB) error {

			caller := runner.NewChainParam(
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) {
						var sku stock_model.Sku
						err = tx.
							Clauses(clause.Locking{
								Strength: "UPDATE",
							}).
							Model(&stock_model.Sku{}).
							First(&sku, req.Msg.Id).
							Error
						if err != nil {
							return ctx, err
						}

						// checking jika masih punya stock atau tidak
						if sku.StockQty != 0 {
							return ctx, fmt.Errorf("cannot delete sku that have stock %d", sku.ID)
						}

						return next(ctx)
					}
				},
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) { // deleting sku
						err = tx.
							Model(&stock_model.Sku{}).
							Where("id = ? AND deleted = false", req.Msg.Id).
							Update("deleted", true).
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

	return connect.NewResponse(&stockv1.DeleteSkuResponse{}), err
}
