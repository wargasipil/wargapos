package event_service

import (
	"context"
	"errors"
	eventv1 "wargapos/backend/gen/wargapos/event/v1"

	"connectrpc.com/connect"
)

// Send implements [eventv1connect.EventServiceHandler].
func (e *EventService) Send(ctx context.Context, req *connect.Request[eventv1.SendRequest]) (*connect.Response[eventv1.SendResponse], error) {

	if e.eventChan == nil {
		return nil, errors.New("event channel not initiated")
	}

	select {
	case <-ctx.Done():
		return &connect.Response[eventv1.SendResponse]{}, errors.New("context event send canceled")
	case e.eventChan <- req.Msg.Evt:
		return &connect.Response[eventv1.SendResponse]{}, nil
	}

}
