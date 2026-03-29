package event_service

import (
	"context"
	eventv1 "wargapos/backend/gen/wargapos/event/v1"

	"connectrpc.com/connect"
)

// Send implements [eventv1connect.EventServiceHandler].
func (e *EventService) Send(context.Context, *connect.Request[eventv1.SendRequest]) (*connect.Response[eventv1.SendResponse], error) {
	panic("unimplemented")
}
