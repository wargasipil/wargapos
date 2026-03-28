package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service/stock_core"
	"wargapos/backend/pkgs/runner"
)

func (s *StockService) CancelTransaction(
	ctx context.Context,
	req *connect.Request[stockv1.CancelTransactionRequest],
) (*connect.Response[stockv1.CancelTransactionResponse], error) {
	var err error

	claims := auth.ClaimsFromContext(ctx)
	var userID uint32
	if claims != nil {
		userID = claims.UserID
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var txRecord models.StockTransaction
		caller := runner.NewChainParam(
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(data context.Context) (context.Context, error) { // get and locking transaction
					err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).
						Preload("Items").
						First(&txRecord, req.Msg.TransactionId).
						Error
					if err != nil {
						return ctx, err
					}

					if txRecord.Cancelled {
						return ctx, errors.New("transaction already cancelled")
					}

					return next(ctx)

				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) {
					for _, item := range txRecord.Items {
						err = stock_core.SkuStockCancel(ctx, tx, &stock_core.SkuStockCancelPayload{
							TransactionId: txRecord.ID,
							SkuId:         item.SkuID,
							UserId:        userID,
						})
						if err != nil {
							return ctx, err
						}
					}

					return next(ctx)
				}
			},

			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) {
					err = tx.Model(&txRecord).Updates(map[string]any{
						"cancelled": true,
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

	return connect.NewResponse(&stockv1.CancelTransactionResponse{}), err
}
