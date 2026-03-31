package auth

import (
	"context"
	"log/slog"
	rolebasedv1 "wargapos/backend/gen/wargapos/rolebased/v1"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/descriptorpb"
)

type RoleInterceptor struct{}

// WrapStreamingClient implements [connect.Interceptor].
func (r *RoleInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

// WrapStreamingHandler implements [connect.Interceptor].
func (r *RoleInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return next
}

// WrapUnary implements [connect.Interceptor].
func (r *RoleInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		var policy *rolebasedv1.RequestPolicy
		data := req.Any()

		msg, ok := data.(proto.Message)
		if ok {
			desc := msg.ProtoReflect().Descriptor()
			opts := desc.Options().(*descriptorpb.MessageOptions)

			if !proto.HasExtension(opts, rolebasedv1.E_RequestPolicy) {
				return next(ctx, req)
			}

			ext := proto.GetExtension(opts, rolebasedv1.E_RequestPolicy)
			policy = ext.(*rolebasedv1.RequestPolicy)
		}

		slog.Info("asd", "procedure", req.Spec().Procedure, "data", policy)

		return next(ctx, req)
	}
}

func NewRoleInterceptor() *RoleInterceptor {
	return &RoleInterceptor{}
}
