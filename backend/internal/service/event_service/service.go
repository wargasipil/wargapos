package event_service

import (
	"sync"
	eventv1 "wargapos/backend/gen/wargapos/event/v1"

	"connectrpc.com/connect"
)

type EventService struct {
	sync.Mutex
	listeners map[string]*connect.ServerStream[eventv1.PullResponse]
	eventChan chan *eventv1.Event
}

func NewEventService() *EventService {
	return &EventService{
		listeners: map[string]*connect.ServerStream[eventv1.PullResponse]{},
	}
}
