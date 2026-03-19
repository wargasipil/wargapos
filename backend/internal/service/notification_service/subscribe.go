package notification_service

import (
	"context"
	"fmt"

	"connectrpc.com/connect"

	notificationv1 "wargapos/backend/gen/wargapos/notification/v1"
)

func (s *NotificationService) Subscribe(
	ctx context.Context,
	_ *connect.Request[notificationv1.SubscribeRequest],
	stream *connect.ServerStream[notificationv1.Notification],
) error {
	key := fmt.Sprintf("%p", stream)

	s.mu.Lock()
	s.subscribers[key] = &subscriber{stream: stream}
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.subscribers, key)
		s.mu.Unlock()
	}()

	// Hold open until the client disconnects or the server shuts down.
	<-ctx.Done()
	return nil
}
