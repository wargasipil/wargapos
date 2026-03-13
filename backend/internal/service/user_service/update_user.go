package user_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/internal/models"
)

func (s *UserService) UpdateUser(
	ctx context.Context,
	req *connect.Request[userv1.UpdateUserRequest],
) (*connect.Response[userv1.UpdateUserResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	updates := map[string]any{
		"full_name": req.Msg.FullName,
		"email":     req.Msg.Email,
		"role":      protoRoleToString(req.Msg.Role),
		"is_active": req.Msg.IsActive,
	}
	if err := s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", req.Msg.Id).Updates(updates).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&userv1.UpdateUserResponse{User: toProtoUser(&user)}), nil
}
