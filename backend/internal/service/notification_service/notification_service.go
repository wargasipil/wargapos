package notification_service

import (
	"sync"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	notificationv1 "wargapos/backend/gen/wargapos/notification/v1"
	"wargapos/backend/gen/wargapos/notification/v1/notificationv1connect"
	"wargapos/backend/internal/notifier"
)

type subscriber struct {
	stream *connect.ServerStream[notificationv1.Notification]
}

// NotificationService implements the Connect RPC handler and the notifier.Notifier interface.
type NotificationService struct {
	db          *gorm.DB
	mu          sync.RWMutex
	subscribers map[string]*subscriber
}

// NewNotificationService is the Wire provider constructor.
func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{
		db:          db,
		subscribers: make(map[string]*subscriber),
	}
}

var _ notificationv1connect.NotificationServiceHandler = (*NotificationService)(nil)
var _ notifier.Notifier = (*NotificationService)(nil)
