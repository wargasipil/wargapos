package handler

import (
	"context"

	"connectrpc.com/connect"
	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
)

type UserHandler struct{}

var _ userv1connect.UserServiceHandler = (*UserHandler)(nil)

func (h *UserHandler) CreateUser(
	ctx context.Context,
	req *connect.Request[userv1.CreateUserRequest],
) (*connect.Response[userv1.CreateUserResponse], error) {
	return connect.NewResponse(&userv1.CreateUserResponse{
		User: &userv1.User{Id: "stub-id", Username: req.Msg.Username},
	}), nil
}

func (h *UserHandler) GetUser(
	ctx context.Context,
	req *connect.Request[userv1.GetUserRequest],
) (*connect.Response[userv1.GetUserResponse], error) {
	return connect.NewResponse(&userv1.GetUserResponse{
		User: &userv1.User{Id: req.Msg.Id, Username: "stub-user"},
	}), nil
}

func (h *UserHandler) UpdateUser(
	ctx context.Context,
	req *connect.Request[userv1.UpdateUserRequest],
) (*connect.Response[userv1.UpdateUserResponse], error) {
	return connect.NewResponse(&userv1.UpdateUserResponse{
		User: &userv1.User{Id: req.Msg.Id},
	}), nil
}

func (h *UserHandler) DeleteUser(
	ctx context.Context,
	req *connect.Request[userv1.DeleteUserRequest],
) (*connect.Response[userv1.DeleteUserResponse], error) {
	return connect.NewResponse(&userv1.DeleteUserResponse{}), nil
}

func (h *UserHandler) ListUsers(
	ctx context.Context,
	req *connect.Request[userv1.ListUsersRequest],
) (*connect.Response[userv1.ListUsersResponse], error) {
	return connect.NewResponse(&userv1.ListUsersResponse{
		Users: []*userv1.User{},
		Total: 0,
	}), nil
}
