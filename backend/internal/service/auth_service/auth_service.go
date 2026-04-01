package auth_service

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	authv1connect "wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	rolebasedv1 "wargapos/backend/gen/wargapos/rolebased/v1"
	"wargapos/backend/internal/config"
	internalauth "wargapos/backend/internal/auth"
)

// ErrInvalidCredentials is returned when username/password do not match.
var ErrInvalidCredentials = errors.New("invalid credentials")

// AuthService implements authv1connect.AuthServiceHandler directly.
type AuthService struct {
	db          *gorm.DB
	jwtSecret   []byte
	expireHours int
}

// NewAuthService is the Wire provider constructor.
func NewAuthService(db *gorm.DB, authCfg config.AuthConfig) *AuthService {
	expireHours := authCfg.TokenExpireHours
	if expireHours <= 0 {
		expireHours = 24
	}
	return &AuthService{
		db:          db,
		jwtSecret:   []byte(authCfg.JWTSecret),
		expireHours: expireHours,
	}
}

var _ authv1connect.AuthServiceHandler = (*AuthService)(nil)

func (s *AuthService) signToken(userID uint32, role string, exp time.Time) (string, error) {
	claims := internalauth.Claims{
		Identity: rolebasedv1.Identity{
			IdentityId:   userID,
			Role:         stringToRoleEnum(role),
			IdentityType: rolebasedv1.IdentityType_IDENTITY_TYPE_GENERAL_USER,
			Agent:        "browser",
		},
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatUint(uint64(userID), 10),
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

func stringToRoleEnum(s string) rolebasedv1.Role {
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
		return rolebasedv1.Role_ROLE_UNSPECIFIED
	}
}

func roleEnumToString(r rolebasedv1.Role) string {
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
