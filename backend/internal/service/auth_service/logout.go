package auth_service

import (
	"context"

	"connectrpc.com/connect"

	authv1 "wargapos/backend/gen/wargapos/auth/v1"
)

func (s *AuthService) Logout(
	ctx context.Context,
	req *connect.Request[authv1.LogoutRequest],
) (*connect.Response[authv1.LogoutResponse], error) {
	// Stateless JWT — no server-side invalidation at MVP.
	return connect.NewResponse(&authv1.LogoutResponse{}), nil
}
