package stock_service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/pdcgo/shared/db_models"
	"gorm.io/gorm"

	eventv1 "wargapos/backend/gen/wargapos/event/v1"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service/stock_core"
	"wargapos/backend/internal/service/stock_service/stock_model"
	"wargapos/backend/pkgs/runner"
)

func (s *StockService) CreateTransaction(
	ctx context.Context,
	req *connect.Request[stockv1.CreateTransactionRequest],
) (*connect.Response[stockv1.CreateTransactionResponse], error) {

	claims := auth.ClaimsFromContext(ctx)
	var userID uint32
	if claims != nil {
		userID = claims.Identity.IdentityId
	}

	// Derive transaction type and initial placement status from oneof kind
	var txType stockv1.TransactionType
	var placementStatus stockv1.PlacementStatus

	var txRecord models.StockTransaction
	var stockLogs []*stockv1.LogEvent
	var items []*models.StockTransactionItem
	var lockSkuIds []uint32

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		var chains []runner.NextHandlerParam[context.Context] = []runner.NextHandlerParam[context.Context]{}

		switch kindPayload := req.Msg.Kind.(type) {

		case *stockv1.CreateTransactionRequest_StockIn:

			chains = append(
				chains,
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) { // validating stock in
						skuMap := map[uint32]int32{}
						for _, item := range kindPayload.StockIn.Items {
							if skuMap[item.SkuId] != 0 {
								return ctx, fmt.Errorf("item sku in transaction duplicate")
							}
							skuMap[item.SkuId] = item.Quantity
						}

						// validating placement
						placeMap := map[uint32]int32{}
						for _, place := range kindPayload.StockIn.Placement {
							placeMap[place.SkuId] += place.Count
						}

						if len(skuMap) != len(placeMap) {
							return ctx, errors.New("placement and sku invalid")
						}

						for skuId, qty := range skuMap {
							if qty != placeMap[skuId] {
								return ctx, errors.New("sku %d quantity and placement not valid")
							}

							lockSkuIds = append(lockSkuIds, skuId)
						}

						return next(ctx)
					}
				},
				LockSkus(tx, lockSkuIds),
				CreateTransaction(
					tx,
					stockv1.TransactionType_TRANSACTION_TYPE_STOCK_IN,
					stockv1.PlacementStatus_PLACEMENT_STATUS_SET,
					req.Msg.Note,
					&txRecord),
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) { // creating items
						for _, inItem := range kindPayload.StockIn.Items {
							// sku costing
							logs, err := stock_core.SkuStockAdd(ctx, tx, &stock_core.SkuStockAddPayload{
								SkuId:         inItem.SkuId,
								TransactionId: txRecord.ID,
								UserId:        userID,
								Total:         inItem.Total,
								Qty:           inItem.Quantity,
								CreatedAt:     time.Now(),
							})

							if err != nil {
								return ctx, err
							}
							stockLogs = append(stockLogs, logs...)
							items = append(
								items,
								&models.StockTransactionItem{
									TransactionID: txRecord.ID,
									SkuID:         inItem.SkuId,
									Quantity:      inItem.Quantity,
									Total:         inItem.Total,
								},
							)
						}

						_, err := stock_core.AddPlacements(tx, txRecord.ID, userID, kindPayload.StockIn.Placement)
						if err != nil {
							return ctx, err
						}

						return next(ctx)
					}
				},
				FinalizeTransaction(tx, items, &txRecord),
			)

		case *stockv1.CreateTransactionRequest_Move:

			chains = append(
				chains,
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) { // validating move sku
						skuMap := map[uint32]bool{}
						for _, move := range kindPayload.Move.Move {
							if move.FromRackId == move.ToRackId {
								return ctx, errors.New("cannot move same rack")
							}

							if !skuMap[move.SkuId] {
								skuMap[move.SkuId] = true
								lockSkuIds = append(lockSkuIds, move.SkuId)
							}

						}

						return next(ctx)
					}
				},
				LockSkus(tx, lockSkuIds),
				CreateTransaction(
					tx,
					stockv1.TransactionType_TRANSACTION_TYPE_PLACE_ADJUSTMENT,
					stockv1.PlacementStatus_PLACEMENT_STATUS_SET, req.Msg.Note,
					&txRecord,
				),
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) { // moving sku placement

						_, err := stock_core.MovePlacements(tx, txRecord.ID, userID, kindPayload.Move.Move)
						if err != nil {
							return ctx, err
						}

						skuMap := map[uint32]*models.StockTransactionItem{}
						for _, place := range kindPayload.Move.Move {
							if skuMap[place.SkuId] == nil {
								skuMap[place.SkuId] = &models.StockTransactionItem{
									SkuID:    place.SkuId,
									Quantity: place.Change,
									Total:    0,
								}
							} else {
								skuMap[place.SkuId].Quantity += place.Change
							}
						}

						for _, item := range skuMap {
							d := item
							items = append(items, d)
						}

						return next(ctx)
					}
				},
				FinalizeTransaction(tx, items, &txRecord),
			)

		case *stockv1.CreateTransactionRequest_Problem:

			chains = append(
				chains,
				LockSkus(tx, lockSkuIds),
				CreateTransaction(
					tx,
					stockv1.TransactionType_TRANSACTION_TYPE_PROBLEM,
					stockv1.PlacementStatus_PLACEMENT_STATUS_SET, req.Msg.Note,
					&txRecord,
				),
				func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
					return func(ctx context.Context) (context.Context, error) {

						kindPayload.Problem.Problem
						panic("unimplemented")
						return next(ctx)
					}
				},
				FinalizeTransaction(tx, items, &txRecord),
			)
		case *stockv1.CreateTransactionRequest_Order:
			txType = stockv1.TransactionType_TRANSACTION_TYPE_ORDER
			placementStatus = stockv1.PlacementStatus_PLACEMENT_STATUS_REVIEW
		default:
			return errors.New("transaction kind is invalid")
		}

		caller := runner.NewChainParam(

			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // stock-core processing per kind
					switch k := req.Msg.Kind.(type) {

					case *stockv1.CreateTransactionRequest_Order:
						txRecord.Receipt = k.Order.Receipt
						txRecord.ReceiptFile = k.Order.ReceiptFile

						// create transaction items + total
						for _, item := range k.Order.Items {
							txItem := models.StockTransactionItem{
								TransactionID: txRecord.ID,
								SkuID:         item.SkuId,
								Quantity:      item.Quantity,
								Price:         item.Total,
							}
							if err := tx.Create(&txItem).Error; err != nil {
								return ctx, err
							}
							txRecord.Total += item.Total
						}
						if err := tx.Save(&txRecord).Error; err != nil {
							return ctx, err
						}

						// provision + commit stock for each item
						for _, item := range k.Order.Items {
							var sku models.Sku
							if err := tx.First(&sku, item.SkuId).Error; err != nil {
								return ctx, fmt.Errorf("sku %d not found", item.SkuId)
							}
							costingType := sku.CostingType
							if costingType == stockv1.CostingType_COSTING_TYPE_UNSPECIFIED {
								costingType = stockv1.CostingType_COSTING_TYPE_FIFO
							}
							_, committed, err := stock_core.SkuStockProvision(ctx, tx, &stock_core.SkuStockProvisionPayload{
								SkuId:       item.SkuId,
								UserId:      userID,
								Qty:         item.Quantity,
								CostingType: costingType,
							})
							if err != nil {
								return ctx, err
							}
							if _, err = committed(txRecord.ID); err != nil {
								return ctx, err
							}
						}

					case *stockv1.CreateTransactionRequest_Problem:
						// Rack stock problems (BROKEN / LOST)
						for _, p := range k.Problem.Problem {
							change := p.Count
							// BROKEN and LOST are always deductions
							if p.Type == stockv1.PlacementType_PLACEMENT_TYPE_BROKEN ||
								p.Type == stockv1.PlacementType_PLACEMENT_TYPE_LOST {
								change = -change
							}
							if err := tx.Exec(`
								UPDATE rack_placements SET left_stock = left_stock + ? WHERE sku_id = ? AND rack_id = ?
							`, change, p.SkuId, p.RackId).Error; err != nil {
								return ctx, err
							}
							pl := stock_model.PlacementLog{
								SkuID:         p.SkuId,
								ToRackID:      p.RackId,
								PlacementType: int16(p.Type),
								TransactionID: txRecord.ID,
								ActorID:       userID,
								Change:        change,
								Note:          p.Reason,
								CreatedAt:     txRecord.CreatedAt,
							}
							if err := tx.Create(&pl).Error; err != nil {
								return ctx, err
							}
						}
					}

					return next(ctx)
				}
			},
		)

		_, err := caller(ctx)
		return err
	})

	if err != nil {
		return nil, err
	}

	// Send stock events (only for StockIn which generates stockLogs)
	if len(stockLogs) > 0 {
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
	}

	return connect.NewResponse(&stockv1.CreateTransactionResponse{
		Transaction: toProtoTransaction(&txRecord),
	}), nil
}

func LockSkus(
	tx *gorm.DB,
	lockIds []uint32,
) runner.NextHandlerParam[context.Context] {
	return func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
		return func(ctx context.Context) (context.Context, error) {
			var templock []uint32 = []uint32{}

			if len(lockIds) == 0 {
				return ctx, errors.New("cannot lock empty sku")
			}

			err := tx.
				Model(&db_models.Sku{}).
				Where("id in ?", lockIds).
				Select("1").
				Find(&templock).
				Error

			if err != nil {
				return ctx, err
			}

			return next(ctx)
		}
	}
}

func CreateTransaction(
	tx *gorm.DB,
	txType stockv1.TransactionType,
	placementStatus stockv1.PlacementStatus,
	note string,
	txRecord *models.StockTransaction,

) runner.NextHandlerParam[context.Context] {
	return func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
		return func(ctx context.Context) (context.Context, error) { // create transaction record
			txdata := models.StockTransaction{
				TransactionType: txType,
				PlacementStatus: placementStatus,
				Note:            note,
				CreatedAt:       time.Now(),
			}
			if err := tx.Create(&txdata).Error; err != nil {
				return ctx, err
			}

			*txRecord = txdata
			return next(ctx)
		}
	}
}

func FinalizeTransaction(
	tx *gorm.DB,
	items []*models.StockTransactionItem,
	txRecord *models.StockTransaction,
) runner.NextHandlerParam[context.Context] {
	return func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
		return func(ctx context.Context) (context.Context, error) {
			if txRecord.ID == 0 {
				return ctx, errors.New("cannot finalize transaction with id 0")
			}

			if len(items) == 0 {
				return ctx, errors.New("cannot finalize transaction with empty items")
			}

			for _, item := range items {
				item.TransactionID = txRecord.ID
				if err := tx.Create(&item).Error; err != nil {
					return ctx, err
				}
				txRecord.Total += item.Total
			}
			if err := tx.Save(&txRecord).Error; err != nil {
				return ctx, err
			}

			return next(ctx)
		}
	}
}
