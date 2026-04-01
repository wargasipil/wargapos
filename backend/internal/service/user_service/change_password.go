package user_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/models"
)

func (s *UserService) ChangePassword(
	ctx context.Context,
	req *connect.Request[userv1.ChangePasswordRequest],
) (*connect.Response[userv1.ChangePasswordResponse], error) {
	if req.Msg.CurrentPassword == "" || req.Msg.NewPassword == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("current_password and new_password are required"))
	}

	claims := auth.ClaimsFromContext(ctx)
	if claims == nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("missing authorization"))
	}

	// Load user from DB.
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", claims.Identity.IdentityId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("user not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Verify current password.
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Msg.CurrentPassword)); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, errors.New("current password is incorrect"))
	}

	// Hash new password.
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Msg.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", claims.Identity.IdentityId).Update("password_hash", string(hashed)).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&userv1.ChangePasswordResponse{}), nil
}
