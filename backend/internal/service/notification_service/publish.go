package notification_service

import (
	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	notificationv1 "wargapos/backend/gen/wargapos/notification/v1"
	"wargapos/backend/internal/models"
)

// Publish saves the notification to the DB and broadcasts it to all active subscribers.
// Implements notifier.Notifier.
func (s *NotificationService) Publish(n *models.Notification) {
	if err := s.db.Create(n).Error; err != nil {
		return
	}

	proto := toProtoNotification(n)

	s.mu.RLock()
	streams := make([]*connect.ServerStream[notificationv1.Notification], 0, len(s.subscribers))
	for _, sub := range s.subscribers {
		streams = append(streams, sub.stream)
	}
	s.mu.RUnlock()

	for _, st := range streams {
		go func(st *connect.ServerStream[notificationv1.Notification]) {
			_ = st.Send(proto)
		}(st)
	}
}

func toProtoNotification(n *models.Notification) *notificationv1.Notification {
	var orderID int64
	if n.OrderID != nil {
		orderID = *n.OrderID
	}
	return &notificationv1.Notification{
		Id:        n.ID,
		Type:      notificationv1.NotificationType(n.Type),
		Title:     n.Title,
		Body:      n.Body,
		OrderId:   orderID,
		IsRead:    n.IsRead,
		CreatedAt: timestamppb.New(n.CreatedAt),
	}
}
