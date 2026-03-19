package auth

import (
	"context"
	"errors"
	"strings"

	"connectrpc.com/connect"
	"github.com/golang-jwt/jwt/v5"
)

// Claims is the canonical JWT claims struct shared across all services.
type Claims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type claimsKey struct{}

// ClaimsFromContext retrieves Claims injected by the interceptor.
// Returns nil on public routes where no token was provided.
func ClaimsFromContext(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsKey{}).(*Claims)
	return c
}

// publicRoutes bypass JWT validation entirely.
var publicRoutes = map[string]bool{
	"/wargapos.auth.v1.AuthService/Login":                           true,
	"/wargapos.auth.v1.AuthService/ValidateToken":                   true,
	"/wargapos.product.v1.ProductService/ListProducts":              true,
	"/wargapos.product.v1.ProductService/GetProduct":                true,
	"/wargapos.product.v1.ProductService/ListCategories":            true,
	"/wargapos.transaction.v1.TransactionService/CreateTransaction": true,
	"/wargapos.table.v1.TableService/GetTable":                      true,
	"/wargapos.table.v1.TableService/ListTables":                    true,
	"/wargapos.settings.v1.SettingsService/GetSettings":             true,
	"/wargapos.device.v1.DeviceService/Connect":                                    true,
	"/wargapos.device.v1.DeviceService/ListDevices":                               true,
	"/wargapos.notification.v1.NotificationService/ListNotifications":             true,
	"/wargapos.notification.v1.NotificationService/MarkAllRead":                   true,
}

// routeRoles maps procedures to allowed roles.
// Procedures not in this map require any valid JWT (any role is accepted).
var routeRoles = map[string][]string{
	// Any authenticated user
	"/wargapos.user.v1.UserService/GetUser":                         {"admin", "manager", "cashier"},
	"/wargapos.user.v1.UserService/ChangePassword":                  {"admin", "manager", "cashier"},
	"/wargapos.transaction.v1.TransactionService/ListTransactions":  {"admin", "manager", "cashier"},
	"/wargapos.stock.v1.StockService/ListStockMovements":            {"admin", "manager", "cashier"},
	// Manager or admin
	"/wargapos.product.v1.ProductService/CreateProduct":             {"admin", "manager"},
	"/wargapos.product.v1.ProductService/UpdateProduct":             {"admin", "manager"},
	"/wargapos.product.v1.ProductService/DeleteProduct":             {"admin", "manager"},
	"/wargapos.product.v1.ProductService/CreateCategory":            {"admin", "manager"},
	"/wargapos.product.v1.ProductService/UpdateCategory":            {"admin", "manager"},
	"/wargapos.product.v1.ProductService/DeleteCategory":            {"admin", "manager"},
	"/wargapos.stock.v1.StockService/AdjustStock":                   {"admin", "manager"},
	"/wargapos.table.v1.TableService/CreateTable":                   {"admin", "manager"},
	"/wargapos.table.v1.TableService/UpdateTable":                   {"admin", "manager"},
	"/wargapos.table.v1.TableService/DeleteTable":                   {"admin", "manager"},
	"/wargapos.transaction.v1.TransactionService/UpdateTransaction": {"admin", "manager"},
	// Admin only
	"/wargapos.user.v1.UserService/CreateUser":                      {"admin"},
	"/wargapos.user.v1.UserService/UpdateUser":                      {"admin"},
	"/wargapos.user.v1.UserService/DeleteUser":                      {"admin"},
	"/wargapos.user.v1.UserService/ListUsers":                       {"admin"},
	"/wargapos.settings.v1.SettingsService/UpdateSettings":          {"admin"},
}

// Interceptor enforces JWT authentication and role-based access control.
type Interceptor struct{ secret []byte }

// NewInterceptor creates an Interceptor with the given JWT secret.
func NewInterceptor(secret []byte) *Interceptor { return &Interceptor{secret: secret} }

func (i *Interceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		procedure := req.Spec().Procedure

		if publicRoutes[procedure] {
			if tok := req.Header().Get("Authorization"); tok != "" {
				if c, err := i.parse(tok); err == nil {
					ctx = context.WithValue(ctx, claimsKey{}, c)
				}
			}
			return next(ctx, req)
		}

		claims, err := i.parse(req.Header().Get("Authorization"))
		if err != nil {
			return nil, connect.NewError(connect.CodeUnauthenticated, err)
		}
		if allowed, ok := routeRoles[procedure]; ok && !hasRole(claims.Role, allowed) {
			return nil, connect.NewError(connect.CodePermissionDenied, errors.New("insufficient permissions"))
		}
		ctx = context.WithValue(ctx, claimsKey{}, claims)
		return next(ctx, req)
	}
}

func (i *Interceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

func (i *Interceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		return next(ctx, conn)
	}
}

func (i *Interceptor) parse(authHeader string) (*Claims, error) {
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == authHeader || tokenStr == "" {
		return nil, errors.New("missing bearer token")
	}
	var c Claims
	_, err := jwt.ParseWithClaims(tokenStr, &c, func(*jwt.Token) (any, error) {
		return i.secret, nil
	})
	if err != nil {
		return nil, errors.New("invalid token")
	}
	return &c, nil
}

func hasRole(role string, allowed []string) bool {
	for _, r := range allowed {
		if role == r {
			return true
		}
	}
	return false
}
