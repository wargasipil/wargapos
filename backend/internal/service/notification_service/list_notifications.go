package notification_service

import (
	"context"

	"connectrpc.com/connect"

	notificationv1 "wargapos/backend/gen/wargapos/notification/v1"
	"wargapos/backend/internal/models"
)

func (s *NotificationService) ListNotifications(
	ctx context.Context,
	req *connect.Request[notificationv1.ListNotificationsRequest],
) (*connect.Response[notificationv1.ListNotificationsResponse], error) {
	page := int(req.Msg.Page)
	pageSize := int(req.Msg.PageSize)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	var total int64
	if err := s.db.WithContext(ctx).Model(&models.Notification{}).Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var rows []models.Notification
	offset := (page - 1) * pageSize
	if err := s.db.WithContext(ctx).
		Order("created_at DESC").
		Offset(offset).Limit(pageSize).
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protos := make([]*notificationv1.Notification, len(rows))
	for i := range rows {
		protos[i] = toProtoNotification(&rows[i])
	}

	return connect.NewResponse(&notificationv1.ListNotificationsResponse{
		Notifications: protos,
		Total:         int32(total),
	}), nil
}
