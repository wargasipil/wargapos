package marketplace_service

import (
	"context"
	"log/slog"
	"net/http"
	"time"
	eventv1 "wargapos/backend/gen/wargapos/event/v1"
	"wargapos/backend/gen/wargapos/event/v1/eventv1connect"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
	"wargapos/backend/pkgs/runner"

	"connectrpc.com/connect"
	"gorm.io/gorm"
)

func (e *MarketplaceService) EventPullRunner(wctx *runner.RunnerContext) error {

	logger := slog.With("service", "marketplace-service")

Loop:
	for {
		select {
		case <-wctx.Done():
			logger.Info("runner stopped")
			return nil

		default:
			logger.Info("connecting event")
			client := eventv1connect.NewEventServiceClient(http.DefaultClient, e.cfg.Server.GetBase())

			stream, err := client.Pull(wctx, &connect.Request[eventv1.PullRequest]{
				Msg: &eventv1.PullRequest{
					SubscribeId: "marketplace-service",
				},
			})
			if err != nil {
				logger.Error("event pull error", "err", err.Error())
				continue Loop
			}

			for stream.Receive() {
				evt := stream.Msg().Evt
				logger.Info("receiving event", "event", evt)

				switch msg := evt.Event.(type) {
				case *eventv1.Event_StockEvent:
					err = e.handleEventStock(wctx, msg)
				}

				if err != nil {
					logger.Error("error handle event", "err", err.Error())
				}
			}

			err = stream.Err()
			if err != nil {
				logger.Error(err.Error())
				time.Sleep(time.Second)
			}

		}
	}
}

func (e *MarketplaceService) handleEventStock(ctx context.Context, evt *eventv1.Event_StockEvent) error {
	var err error

	db := e.db.WithContext(ctx)
	switch msg := evt.StockEvent.Event.(type) {
	case *stockv1.StockEvent_Logs:
		for _, item := range msg.Logs.StockLog {
			change := item.Log.Change
			total := item.Cost.UnitCost * float64(change)
			err = db.Transaction(func(tx *gorm.DB) error {
				err = tx.
					Model(models.MarketplaceProductStock{}).
					Where("sku_id = ?", item.Log.SkuId).
					Updates(map[string]interface{}{
						"updated_at":      time.Now(),
						"left_stock":      gorm.Expr("left_stock + ?", change),
						"stock_valuation": gorm.Expr("stock_valuation + ?", total),
					}).
					Error

				if err != nil {
					return err
				}

				// err = tx.
				// 	Model(&models.MarketplaceProduct{}).
				// 	Where("id in (?)",
				// 		tx.
				// 			Model(models.MarketplaceProductStock{}).
				// 			Where("sku_id = ?", item.SkuId).
				// 			Select("marketplace_product_id")).
				// 	Updates(map[string]interface{}{
				// 		"updated_at": time.Now(),
				// 		"stock":      gorm.Expr("stock + ?", item.Change),
				// 	}).
				// 	Error

				// if err != nil {
				// 	return err
				// }

				return nil

			})

			if err != nil {
				return err
			}

		}
	}

	return err

}
