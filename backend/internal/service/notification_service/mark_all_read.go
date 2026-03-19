package notification_service

import (
	"context"

	"connectrpc.com/connect"

	notificationv1 "wargapos/backend/gen/wargapos/notification/v1"
	"wargapos/backend/internal/models"
)

func (s *NotificationService) MarkAllRead(
	ctx context.Context,
	_ *connect.Request[notificationv1.MarkAllReadRequest],
) (*connect.Response[notificationv1.MarkAllReadResponse], error) {
	if err := s.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("is_read = false").
		Update("is_read", true).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&notificationv1.MarkAllReadResponse{}), nil
}
