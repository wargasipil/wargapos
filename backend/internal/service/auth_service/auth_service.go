package auth_service

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	authv1connect "wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	"wargapos/backend/internal/config"
)

// ErrInvalidCredentials is returned when username/password do not match.
var ErrInvalidCredentials = errors.New("invalid credentials")

type jwtClaims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

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

func (s *AuthService) signToken(userID int64, role string, exp time.Time) (string, error) {
	claims := jwtClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
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
