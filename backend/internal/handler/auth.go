package handler

import (
	"context"

	"connectrpc.com/connect"
	authv1 "wargapos/backend/gen/wargapos/auth/v1"
	"wargapos/backend/gen/wargapos/auth/v1/authv1connect"
)

type AuthHandler struct{}

var _ authv1connect.AuthServiceHandler = (*AuthHandler)(nil)

func (h *AuthHandler) Login(
	ctx context.Context,
	req *connect.Request[authv1.LoginRequest],
) (*connect.Response[authv1.LoginResponse], error) {
	return connect.NewResponse(&authv1.LoginResponse{
		AccessToken:  "stub-access-token",
		RefreshToken: "stub-refresh-token",
		ExpiresAt:    0,
	}), nil
}

func (h *AuthHandler) Logout(
	ctx context.Context,
	req *connect.Request[authv1.LogoutRequest],
) (*connect.Response[authv1.LogoutResponse], error) {
	return connect.NewResponse(&authv1.LogoutResponse{}), nil
}

func (h *AuthHandler) ValidateToken(
	ctx context.Context,
	req *connect.Request[authv1.ValidateTokenRequest],
) (*connect.Response[authv1.ValidateTokenResponse], error) {
	return connect.NewResponse(&authv1.ValidateTokenResponse{
		Valid:   true,
		UserId:  "stub-user-id",
		Role:    "admin",
	}), nil
}
