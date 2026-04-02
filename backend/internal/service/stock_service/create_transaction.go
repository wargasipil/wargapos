package stock_service

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	eventv1 "wargapos/backend/gen/wargapos/event/v1"
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
		userID = claims.Identity.IdentityId
	}

	var txRecord models.StockTransaction
	var stockLogs []*stockv1.LogEvent

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
									logs, err := stock_core.SkuStockAdd(ctx, tx, &stock_core.SkuStockAddPayload{
										SkuId:         item.SkuId,
										TransactionId: txRecord.ID,
										UserId:        userID,
										Total:         item.Total,
										Qty:           item.Quantity,
										CreatedAt:     txRecord.CreatedAt,
									})
									if err != nil {
										return ctx, err
									}

									for _, log := range logs {
										stockLogs = append(stockLogs, log)
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

	if err != nil {
		return nil, err
	}

	// sending to event
	if s.eventClient == nil {
		return connect.NewResponse(&stockv1.CreateTransactionResponse{
			Transaction: toProtoTransaction(&txRecord),
		}), nil
	}
	_, err = s.eventClient.Send(ctx, &connect.Request[eventv1.SendRequest]{
		Msg: &eventv1.SendRequest{
			PushId: "default",
			Evt: &eventv1.Event{
				Event: &eventv1.Event_StockEvent{
					StockEvent: &stockv1.StockEvent{
						Event: &stockv1.StockEvent_Logs{
							Logs: &stockv1.StockLogEvent{
								StockLog: stockLogs,
							},
						},
					},
				},
			},
		},
	})

	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&stockv1.CreateTransactionResponse{
		Transaction: toProtoTransaction(&txRecord),
	}), err
}
