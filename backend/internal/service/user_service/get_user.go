package user_service

import (
	"context"

	"connectrpc.com/connect"

	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/internal/models"
)

func (s *UserService) GetUser(
	ctx context.Context,
	req *connect.Request[userv1.GetUserRequest],
) (*connect.Response[userv1.GetUserResponse], error) {
	var users []models.User
	if err := s.db.WithContext(ctx).
		Where("id IN ?", req.Msg.Ids).
		Find(&users).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	result := make(map[uint32]*userv1.User, len(users))
	for i := range users {
		result[users[i].ID] = toProtoUser(&users[i])
	}

	return connect.NewResponse(&userv1.GetUserResponse{Users: result}), nil
}
