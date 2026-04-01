package user_service

import (
	"gorm.io/gorm"

	rolebasedv1 "wargapos/backend/gen/wargapos/rolebased/v1"
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
	imageURL := ""
	if u.ImageURL != nil {
		imageURL = *u.ImageURL
	}
	return &userv1.User{
		Id:       u.ID,
		Username: u.Username,
		FullName: u.FullName,
		Email:    u.Email,
		Role:     stringToProtoRole(u.Role),
		IsActive: u.IsActive,
		ImageUrl: imageURL,
	}
}

func protoRoleToString(r rolebasedv1.Role) string {
	switch r {
	case rolebasedv1.Role_ROLE_ROOT:
		return "root"
	case rolebasedv1.Role_ROLE_ADMIN:
		return "admin"
	case rolebasedv1.Role_ROLE_ACCOUNTANT:
		return "accountant"
	case rolebasedv1.Role_ROLE_CASHIER:
		return "cashier"
	case rolebasedv1.Role_ROLE_WAREHOUSE_ADMIN:
		return "warehouse_admin"
	case rolebasedv1.Role_ROLE_WAREHOUSE_MEMBER:
		return "warehouse_member"
	default:
		return "cashier"
	}
}

func stringToProtoRole(s string) rolebasedv1.Role {
	switch s {
	case "root":
		return rolebasedv1.Role_ROLE_ROOT
	case "admin":
		return rolebasedv1.Role_ROLE_ADMIN
	case "accountant":
		return rolebasedv1.Role_ROLE_ACCOUNTANT
	case "cashier":
		return rolebasedv1.Role_ROLE_CASHIER
	case "warehouse_admin":
		return rolebasedv1.Role_ROLE_WAREHOUSE_ADMIN
	case "warehouse_member":
		return rolebasedv1.Role_ROLE_WAREHOUSE_MEMBER
	default:
		return rolebasedv1.Role_ROLE_CASHIER
	}
}
