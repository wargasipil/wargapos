package auth

import (
	"context"
	"errors"

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
// Streaming handlers are authenticated by the JWT interceptor; role policies
// are only enforced on unary RPCs where the request message is available.
func (r *RoleInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return next
}

// WrapUnary implements [connect.Interceptor].
func (r *RoleInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		msg, ok := req.Any().(proto.Message)
		if !ok {
			return nil, errors.New("[role] request is not proto message")
		}

		desc := msg.ProtoReflect().Descriptor()
		opts, ok := desc.Options().(*descriptorpb.MessageOptions)
		if !ok || opts == nil {
			// jika options tidak ada sama sekali
			return nil, errors.New("[role] request is not have request_policy")
		}

		if !proto.HasExtension(opts, rolebasedv1.E_RequestPolicy) {
			return nil, errors.New("[role] request is not have request_policy")
		}

		ext := proto.GetExtension(opts, rolebasedv1.E_RequestPolicy)
		policy, ok := ext.(*rolebasedv1.RequestPolicy)

		if !ok || policy == nil {
			return nil, errors.New("[role] request is not have request_policy convert")
		}

		if policy.AllowPublic {
			return next(ctx, req)
		}

		if err := enforcePolicy(ctx, policy); err != nil {
			return nil, err
		}

		return next(ctx, req)
	}
}

func enforcePolicy(ctx context.Context, policy *rolebasedv1.RequestPolicy) error {
	claims := ClaimsFromContext(ctx)
	if claims == nil {
		return connect.NewError(connect.CodeUnauthenticated, errors.New("authentication required"))
	}

	if policy.AllowAuthenticated {
		return nil
	}

	for _, allowed := range policy.Roles {
		if claims.Identity.Role == allowed {
			return nil
		}
	}
	return connect.NewError(connect.CodePermissionDenied, errors.New("insufficient permissions"))
}

func NewRoleInterceptor() *RoleInterceptor {
	return &RoleInterceptor{}
}
