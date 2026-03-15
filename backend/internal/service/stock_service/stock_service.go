package stock_service

import (
	"errors"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/config"
)

type jwtClaims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// StockService implements stockv1connect.StockServiceHandler.
type StockService struct {
	db        *gorm.DB
	jwtSecret []byte
}

// NewStockService is the Wire provider constructor.
func NewStockService(db *gorm.DB, authCfg config.AuthConfig) *StockService {
	return &StockService{db: db, jwtSecret: []byte(authCfg.JWTSecret)}
}

var _ stockv1connect.StockServiceHandler = (*StockService)(nil)

func (s *StockService) parseUserID(authHeader string) (int64, error) {
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == "" {
		return 0, errors.New("missing authorization token")
	}
	claims := &jwtClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return 0, errors.New("invalid token")
	}
	return claims.UserID, nil
}
