package transaction_service

import (
	"log/slog"
	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/pkgs/runner"
)

type Runner runner.RunnerFunc

func NewTransactionRunner() Runner {
	return func(wctx *runner.RunnerContext) error {
		var err error
		slog.Info("start transaction runner")

		defer close(defaultPool.eventChan)
		for {
			select {
			case <-wctx.Done():
				slog.Info("transaction runner stopped")
				return nil
			case event := <-defaultPool.eventChan:
				func() {
					defaultPool.Lock()
					defer defaultPool.Unlock()
					for streamId, stream := range defaultPool.conn {

						slog.Info("transaction runner sending event", "id", streamId)
						err = stream.Send(&transactionv1.SubscribeResponse{
							Event: event,
						})
						if err != nil {
							slog.Error("transaction runner", "err", err.Error())
							return
						}
					}

				}()
			}
		}
	}
}
