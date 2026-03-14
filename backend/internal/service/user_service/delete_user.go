package user_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/internal/models"
)

func (s *UserService) DeleteUser(
	ctx context.Context,
	req *connect.Request[userv1.DeleteUserRequest],
) (*connect.Response[userv1.DeleteUserResponse], error) {
	if req.Msg.Id == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	result := s.db.WithContext(ctx).Delete(&models.User{}, "id = ?", req.Msg.Id)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, gorm.ErrRecordNotFound)
	}
	return connect.NewResponse(&userv1.DeleteUserResponse{}), nil
}
