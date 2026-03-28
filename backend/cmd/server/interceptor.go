package main

import (
	"wargapos/backend/internal/auth"

	"connectrpc.com/connect"
)

type DefaultServiceClientOption connect.Option

func NewDefaultServiceClientOption() DefaultServiceClientOption {
	tokenInterceptor := auth.NewAuthTokenInterceptor()
	return connect.WithInterceptors(
		tokenInterceptor,
	)
}
