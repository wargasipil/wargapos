package user_service

import (
	"context"

	"connectrpc.com/connect"

	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/internal/models"
)

func (s *UserService) ListUsers(
	ctx context.Context,
	req *connect.Request[userv1.ListUsersRequest],
) (*connect.Response[userv1.ListUsersResponse], error) {
	page := req.Msg.Page
	pageSize := req.Msg.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var users []models.User
	var total int64

	db := s.db.WithContext(ctx).Model(&models.User{})
	if err := db.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if err := db.Offset(int((page-1)*pageSize)).Limit(int(pageSize)).Find(&users).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*userv1.User, len(users))
	for i := range users {
		proto[i] = toProtoUser(&users[i])
	}
	return connect.NewResponse(&userv1.ListUsersResponse{
		Users: proto,
		Total: int32(total),
	}), nil
}
