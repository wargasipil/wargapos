package auth

import (
	"context"
	"errors"
	"strings"
	rolebasedv1 "wargapos/backend/gen/wargapos/rolebased/v1"

	"connectrpc.com/connect"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Identity rolebasedv1.Identity `json:"identity"`
	jwt.RegisteredClaims
}

type AuthTokenInterceptor struct {
	secret []byte
}

func NewAuthTokenInterceptor(secret []byte) *AuthTokenInterceptor {
	return &AuthTokenInterceptor{secret}
}

// WrapStreamingClient implements [connect.Interceptor].
func (a *AuthTokenInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

// WrapStreamingHandler implements [connect.Interceptor].
func (a *AuthTokenInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		if conn.Spec().IsClient {
			token := TokenStringFromContext(ctx)
			if token == "" {

				return next(ctx, conn)
			}
			conn.RequestHeader().Set("Authorization", token)
			return next(ctx, conn)
		}

		token := conn.RequestHeader().Get("Authorization")
		if strings.TrimSpace(token) == "" {
			return next(ctx, conn)
		}

		claims, err := a.parse(token)
		if err != nil {
			return next(ctx, conn)
		}

		ctx = ContextSetClaims(ctx, claims)
		ctx = ContextSetTokenString(ctx, token)
		return next(ctx, conn)
	}
}

// WrapUnary implements [connect.Interceptor].
func (a *AuthTokenInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		if req.Spec().IsClient {
			token := TokenStringFromContext(ctx)
			if token == "" {

				return next(ctx, req)
			}

			req.Header().Set("Authorization", token)
			return next(ctx, req)

		}

		token := req.Header().Get("Authorization")
		if strings.TrimSpace(token) == "" {
			return next(ctx, req)
		}

		claims, err := a.parse(token)
		if err != nil {
			return next(ctx, req)
		}

		ctx = ContextSetClaims(ctx, claims)
		ctx = ContextSetTokenString(ctx, token)

		return next(ctx, req)
	}
}

func (i *AuthTokenInterceptor) parse(authHeader string) (*Claims, error) {
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == authHeader || tokenStr == "" {
		return nil, errors.New("missing bearer token")
	}
	var c Claims
	_, err := jwt.ParseWithClaims(tokenStr, &c, func(*jwt.Token) (any, error) {
		return i.secret, nil
	})
	if err != nil {
		return nil, errors.New("invalid token")
	}
	if c.Identity.IdentityId == 0 {
		return nil, errors.New("invalid token: missing identity")
	}
	return &c, nil
}

type claimsKey struct{}

func ContextSetClaims(ctx context.Context, claims *Claims) context.Context {
	ctx = context.WithValue(ctx, claimsKey{}, claims)
	return ctx
}

func ClaimsFromContext(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsKey{}).(*Claims)
	return c
}

const authContextKey = "auth_token"

func ContextSetTokenString(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, authContextKey, token)
}

func TokenStringFromContext(ctx context.Context) string {
	var token string
	token, _ = ctx.Value(authContextKey).(string)
	return token
}
