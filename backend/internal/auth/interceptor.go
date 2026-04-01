package auth

// publicRoutes bypass JWT validation entirely.
var publicRoutes = map[string]bool{
	"/wargapos.auth.v1.AuthService/Login":                             true,
	"/wargapos.auth.v1.AuthService/ValidateToken":                     true,
	"/wargapos.product.v1.ProductService/ListProducts":                true,
	"/wargapos.product.v1.ProductService/GetProduct":                  true,
	"/wargapos.product.v1.ProductService/ListCategories":              true,
	"/wargapos.transaction.v1.TransactionService/CreateTransaction":   true,
	"/wargapos.marketplace.v1.MarketplaceService/ListShops":           true,
	"/wargapos.marketplace.v1.MarketplaceService/GetShop":             true,
	"/wargapos.table.v1.TableService/GetTable":                        true,
	"/wargapos.table.v1.TableService/ListTables":                      true,
	"/wargapos.settings.v1.SettingsService/GetSettings":               true,
	"/wargapos.device.v1.DeviceService/Connect":                       true,
	"/wargapos.device.v1.DeviceService/ListDevices":                   true,
	"/wargapos.notification.v1.NotificationService/ListNotifications": true,
	"/wargapos.notification.v1.NotificationService/MarkAllRead":       true,
}
