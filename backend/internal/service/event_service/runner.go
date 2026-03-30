package event_service

import (
	"log/slog"
	eventv1 "wargapos/backend/gen/wargapos/event/v1"
	"wargapos/backend/pkgs/runner"
)

func (e *EventService) EventRunner(wctx *runner.RunnerContext) error {
	var err error
	e.eventChan = make(chan *eventv1.Event, 200)

	defer close(e.eventChan)

	for {
		select {
		case <-wctx.Done():
			return nil
		case evt := <-e.eventChan:
			slog.Info("sending event", "event", evt)
			func() {
				e.Lock()
				defer e.Unlock()

				for _, stream := range e.listeners {
					err = stream.Send(
						&eventv1.PullResponse{
							Evt: evt,
						},
					)
					if err != nil {
						slog.Error("sending event error", "err", err.Error())
					}
				}
			}()

		}
	}

}
