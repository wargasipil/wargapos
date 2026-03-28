package stock_service

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service/stock_core"
	"wargapos/backend/pkgs/runner"
)

func (s *StockService) CreateTransaction(
	ctx context.Context,
	req *connect.Request[stockv1.CreateTransactionRequest],
) (*connect.Response[stockv1.CreateTransactionResponse], error) {
	var err error

	claims := auth.ClaimsFromContext(ctx)
	var userID uint32
	if claims != nil {
		userID = claims.UserID
	}

	var txRecord models.StockTransaction

	err = s.
		db.
		WithContext(ctx).
		Transaction(func(tx *gorm.DB) error {
			caller := runner.
				NewChainParam(
					func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
						return func(ctx context.Context) (context.Context, error) { // validating duplicate items
							skuMap := map[uint32]bool{}
							for _, item := range req.Msg.Items {
								if skuMap[item.SkuId] {
									return ctx, fmt.Errorf("item sku in transaction duplicate")
								} else {
									skuMap[item.SkuId] = true
								}
							}

							return next(ctx)
						}
					},
					func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
						return func(ctx context.Context) (context.Context, error) { // creating transaction
							txRecord = models.StockTransaction{
								TransactionType: req.Msg.TransactionType,
								Note:            req.Msg.Note,
								CreatedAt:       time.Now(),
							}

							if err := tx.Create(&txRecord).Error; err != nil {
								return ctx, err
							}
							return next(ctx)
						}
					},
					func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
						return func(ctx context.Context) (context.Context, error) { // creating transaction item

							for _, item := range req.Msg.Items {
								txItem := models.StockTransactionItem{
									TransactionID: txRecord.ID,
									SkuID:         item.SkuId,
									Quantity:      item.Quantity,
									Price:         item.Total,
								}
								err = tx.Create(&txItem).Error
								if err != nil {
									return ctx, err
								}

								txRecord.Total += item.Total
							}

							err = tx.Save(&txRecord).Error
							if err != nil {
								return ctx, err
							}

							return next(ctx)
						}
					},
					func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
						return func(ctx context.Context) (context.Context, error) { // calling stock core
							switch req.Msg.TransactionType {
							case stockv1.TransactionType_TRANSACTION_TYPE_STOCK_IN:

								// iterating sku
								for _, item := range req.Msg.Items {
									err = stock_core.SkuStockAdd(ctx, tx, &stock_core.SkuStockAddPayload{
										SkuId:         item.SkuId,
										TransactionId: txRecord.ID,
										UserId:        userID,
										Total:         item.Total,
										Qty:           item.Quantity,
									})
									if err != nil {
										return ctx, err
									}
								}

							default:
								return ctx, fmt.Errorf("%s not implemented", stockv1.LogType_name[int32(req.Msg.TransactionType)])
							}

							return next(ctx)
						}
					},
				)

			_, err = caller(ctx)
			return err

		})

	return connect.NewResponse(&stockv1.CreateTransactionResponse{
		Transaction: toProtoTransaction(&txRecord),
	}), err
}
