package auth

import (
	"context"

	"connectrpc.com/connect"
)

type AuthTokenInterceptor struct{}

func NewAuthTokenInterceptor() *AuthTokenInterceptor {
	return &AuthTokenInterceptor{}
}

// WrapStreamingClient implements [connect.Interceptor].
func (a *AuthTokenInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

// WrapStreamingHandler implements [connect.Interceptor].
func (a *AuthTokenInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return next
}

// WrapUnary implements [connect.Interceptor].
func (a *AuthTokenInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		if req.Spec().IsClient {
			token, ok := ctx.Value(authContextKey).(string)
			if ok {
				if token != "" {
					req.Header().Set("Authorization", token)
				}
			}

		} else {
			token := req.Header().Get("Authorization")
			ctx = context.WithValue(ctx, authContextKey, token)
		}

		return next(ctx, req)
	}
}
