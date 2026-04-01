package auth_service

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/golang-jwt/jwt/v5"

	authv1 "wargapos/backend/gen/wargapos/auth/v1"
	internalauth "wargapos/backend/internal/auth"
)

func (s *AuthService) ValidateToken(
	ctx context.Context,
	req *connect.Request[authv1.ValidateTokenRequest],
) (*connect.Response[authv1.ValidateTokenResponse], error) {
	claims := &internalauth.Claims{}
	token, err := jwt.ParseWithClaims(req.Msg.Token, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid || claims.Identity.IdentityId == 0 {
		return connect.NewResponse(&authv1.ValidateTokenResponse{Valid: false}), nil
	}
	return connect.NewResponse(&authv1.ValidateTokenResponse{
		Valid:  true,
		UserId: claims.Identity.IdentityId,
		Role:   roleEnumToString(claims.Identity.Role),
	}), nil
}
