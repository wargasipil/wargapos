package event_service

import (
	"context"
	"time"
	eventv1 "wargapos/backend/gen/wargapos/event/v1"

	"connectrpc.com/connect"
)

// Pull implements [eventv1connect.EventServiceHandler].
func (e *EventService) Pull(
	ctx context.Context,
	req *connect.Request[eventv1.PullRequest],
	stream *connect.ServerStream[eventv1.PullResponse],
) error {
	var err error
	e.Lock()
	e.listeners[req.Msg.SubscribeId] = stream
	e.Unlock()

	defer func() {
		e.Lock()
		defer e.Unlock()
		delete(e.listeners, req.Msg.SubscribeId)
	}()

	tick := time.NewTicker(time.Second * 10)
	for {
		select {
		case <-tick.C:
			err = stream.Send(&eventv1.PullResponse{
				Evt: &eventv1.Event{
					Event: &eventv1.Event_Ping{},
				},
			})

			if err != nil {
				return err
			}

		case <-ctx.Done():
			return nil
		}
	}

}
