package user_service

import (
	"gorm.io/gorm"

	userv1 "wargapos/backend/gen/wargapos/user/v1"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
	"wargapos/backend/internal/models"
)

// UserService implements userv1connect.UserServiceHandler directly.
type UserService struct {
	db *gorm.DB
}

// NewUserService is the Wire provider constructor.
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

var _ userv1connect.UserServiceHandler = (*UserService)(nil)

func toProtoUser(u *models.User) *userv1.User {
	return &userv1.User{
		Id:       u.ID,
		Username: u.Username,
		FullName: u.FullName,
		Email:    u.Email,
		Role:     stringToProtoRole(u.Role),
		IsActive: u.IsActive,
	}
}

func protoRoleToString(r userv1.Role) string {
	switch r {
	case userv1.Role_ROLE_ADMIN:
		return "admin"
	case userv1.Role_ROLE_MANAGER:
		return "manager"
	default:
		return "cashier"
	}
}

func stringToProtoRole(s string) userv1.Role {
	switch s {
	case "admin":
		return userv1.Role_ROLE_ADMIN
	case "manager":
		return userv1.Role_ROLE_MANAGER
	default:
		return userv1.Role_ROLE_CASHIER
	}
}
