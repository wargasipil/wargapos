package auth_service

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/golang-jwt/jwt/v5"

	authv1 "wargapos/backend/gen/wargapos/auth/v1"
	internalauth "wargapos/backend/internal/auth"
)

func (s *AuthService) RefreshToken(
	ctx context.Context,
	req *connect.Request[authv1.RefreshTokenRequest],
) (*connect.Response[authv1.RefreshTokenResponse], error) {
	claims := &internalauth.Claims{}
	token, err := jwt.ParseWithClaims(req.Msg.RefreshToken, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid || claims.Identity.IdentityId == 0 {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid or expired refresh token"))
	}

	role := roleEnumToString(claims.Identity.Role)
	userID := claims.Identity.IdentityId

	accessExp := time.Now().Add(time.Duration(s.expireHours) * time.Hour)
	refreshExp := time.Now().Add(time.Duration(s.expireHours*7) * time.Hour)

	accessToken, err := s.signToken(userID, role, accessExp)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	refreshToken, err := s.signToken(userID, role, refreshExp)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.RefreshTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExp.Unix(),
	}), nil
}
