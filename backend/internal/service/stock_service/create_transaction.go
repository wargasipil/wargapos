package stock_service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"connectrpc.com/connect"
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
	var placementStatus int16

	switch req.Msg.Kind.(type) {
	case *stockv1.CreateTransactionRequest_StockIn:
		txType = stockv1.TransactionType_TRANSACTION_TYPE_STOCK_IN
		placementStatus = int16(stockv1.PlacementStatus_PLACEMENT_STATUS_REVIEW)
	case *stockv1.CreateTransactionRequest_Move:
		txType = stockv1.TransactionType_TRANSACTION_TYPE_PLACE_ADJUSTMENT
	case *stockv1.CreateTransactionRequest_Problem:
		txType = stockv1.TransactionType_TRANSACTION_TYPE_PROBLEM
	case *stockv1.CreateTransactionRequest_Order:
		txType = stockv1.TransactionType_TRANSACTION_TYPE_ORDER
		placementStatus = int16(stockv1.PlacementStatus_PLACEMENT_STATUS_REVIEW)
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("transaction kind is required"))
	}

	var txRecord models.StockTransaction
	var stockLogs []*stockv1.LogEvent

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		caller := runner.NewChainParam(
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // validate duplicate SKUs (StockIn only)
					if k, ok := req.Msg.Kind.(*stockv1.CreateTransactionRequest_StockIn); ok {
						skuMap := map[uint32]bool{}
						for _, item := range k.StockIn.Items {
							if skuMap[item.SkuId] {
								return ctx, fmt.Errorf("item sku in transaction duplicate")
							}
							skuMap[item.SkuId] = true
						}
					}
					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // create transaction record
					txRecord = models.StockTransaction{
						TransactionType: txType,
						PlacementStatus: placementStatus,
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
				return func(ctx context.Context) (context.Context, error) { // create transaction items + total (StockIn only)
					k, ok := req.Msg.Kind.(*stockv1.CreateTransactionRequest_StockIn)
					if !ok {
						return next(ctx)
					}
					for _, item := range k.StockIn.Items {
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
					return next(ctx)
				}
			},
			func(next runner.NextFuncParam[context.Context]) runner.NextFuncParam[context.Context] {
				return func(ctx context.Context) (context.Context, error) { // stock-core processing per kind
					switch k := req.Msg.Kind.(type) {

					case *stockv1.CreateTransactionRequest_StockIn:
						// SKU costing via stock_core
						for _, item := range k.StockIn.Items {
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
							stockLogs = append(stockLogs, logs...)
						}

						// Rack placements
						for _, p := range k.StockIn.Placement {
							if p.SkuId == 0 || p.RackId == 0 {
								continue
							}
							if err := tx.Exec(`
								INSERT INTO rack_placements (sku_id, rack_id, left_stock)
								VALUES (?, ?, ?)
								ON CONFLICT (sku_id, rack_id) DO UPDATE SET left_stock = rack_placements.left_stock + excluded.left_stock
							`, p.SkuId, p.RackId, p.Count).Error; err != nil {
								return ctx, err
							}
							pl := stock_model.PlacementLog{
								SkuID:         p.SkuId,
								ToRackID:      p.RackId,
								PlacementType: int16(stockv1.PlacementType_PLACEMENT_TYPE_IN),
								TransactionID: txRecord.ID,
								ActorID:       userID,
								Change:        p.Count,
								CreatedAt:     txRecord.CreatedAt,
							}
							if err := tx.Create(&pl).Error; err != nil {
								return ctx, err
							}
						}

					case *stockv1.CreateTransactionRequest_Move:
						// Rack-to-rack moves — no stock qty change
						for _, m := range k.Move.Move {
							res := tx.Exec(
								`UPDATE rack_placements SET left_stock = left_stock - ? WHERE sku_id = ? AND rack_id = ? AND left_stock >= ?`,
								m.Change, m.SkuId, m.FromRackId, m.Change,
							)
							if res.Error != nil {
								return ctx, res.Error
							}
							if res.RowsAffected == 0 {
								return ctx, errors.New("insufficient stock or SKU not in source rack")
							}
							if err := tx.Exec(`
								INSERT INTO rack_placements (sku_id, rack_id, left_stock)
								VALUES (?, ?, ?)
								ON CONFLICT (sku_id, rack_id) DO UPDATE SET left_stock = rack_placements.left_stock + excluded.left_stock
							`, m.SkuId, m.ToRackId, m.Change).Error; err != nil {
								return ctx, err
							}
							pl := stock_model.PlacementLog{
								SkuID:         m.SkuId,
								FromRackID:    m.FromRackId,
								ToRackID:      m.ToRackId,
								PlacementType: int16(stockv1.PlacementType_PLACEMENT_TYPE_MOVE),
								TransactionID: txRecord.ID,
								ActorID:       userID,
								Change:        m.Change,
								CreatedAt:     txRecord.CreatedAt,
							}
							if err := tx.Create(&pl).Error; err != nil {
								return ctx, err
							}
						}

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
		msg := err.Error()
		if msg == "insufficient stock or SKU not in source rack" || strings.Contains(msg, "insuffient") {
			return nil, connect.NewError(connect.CodeFailedPrecondition, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Send stock events (only for StockIn which generates stockLogs)
	if s.eventClient != nil && len(stockLogs) > 0 {
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

// func (s *StockService) addPlacements(tx *gorm.DB, transactionId uint64, placements []*stockv1.StockInPlacementPayload) error {

// 	for _, placement := range placements {
// 		placelog := stock_model.PlacementLog{
// 			SkuID: placement.,
// 		}
// 	}
// }
