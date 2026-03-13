package auth_service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	authv1 "wargapos/backend/gen/wargapos/auth/v1"
	"wargapos/backend/internal/models"
)

func (s *AuthService) Login(
	ctx context.Context,
	req *connect.Request[authv1.LoginRequest],
) (*connect.Response[authv1.LoginResponse], error) {
	if req.Msg.Username == "" || req.Msg.Password == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("username and password are required"))
	}

	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "username = ?", req.Msg.Username).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("invalid username or password"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Msg.Password)); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("invalid username or password"))
	}

	expiry := time.Duration(s.expireHours) * time.Hour
	exp := time.Now().Add(expiry)

	accessToken, err := s.signToken(user.ID, user.Role, exp)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("sign access token: %w", err))
	}

	refreshToken, err := s.signToken(user.ID, user.Role, time.Now().Add(expiry*7))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("sign refresh token: %w", err))
	}

	return connect.NewResponse(&authv1.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    exp.Unix(),
	}), nil
}
