package marketplace_service_test

import (
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/database"
	"wargapos/backend/internal/service/marketplace_service"
	"wargapos/backend/pkgs/wargatest"
)

func TestCreateShop(t *testing.T) {
	t.Run("creates shop with all fields", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.CreateShop(t.Context(), &connect.Request[marketplacev1.CreateShopRequest]{
					Msg: &marketplacev1.CreateShopRequest{
						Name:     "Toko ABC",
						Type:     marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_SHOPEE,
						Username: "@toko-abc",
						Url:      "https://shopee.co.id/toko-abc",
					},
				})

				assert.Nil(t, err)
				assert.NotNil(t, res.Msg.Shop)
				assert.NotZero(t, res.Msg.Shop.Id)
				assert.Equal(t, "Toko ABC", res.Msg.Shop.Name)
				assert.Equal(t, marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_SHOPEE, res.Msg.Shop.Type)
				assert.Equal(t, "@toko-abc", res.Msg.Shop.Username)
				assert.Equal(t, "https://shopee.co.id/toko-abc", res.Msg.Shop.Url)
				assert.True(t, res.Msg.Shop.IsActive)
			})
	})

	t.Run("shop is active by default", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.CreateShop(t.Context(), &connect.Request[marketplacev1.CreateShopRequest]{
					Msg: &marketplacev1.CreateShopRequest{
						Name:     "Toko Tokped",
						Type:     marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_TOKOPEDIA,
						Username: "@toko-tokped",
					},
				})

				assert.Nil(t, err)
				assert.True(t, res.Msg.Shop.IsActive)
			})
	})

	t.Run("creates shop with optional url empty", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.CreateShop(t.Context(), &connect.Request[marketplacev1.CreateShopRequest]{
					Msg: &marketplacev1.CreateShopRequest{
						Name:     "Toko Lazada",
						Type:     marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_LAZADA,
						Username: "@toko-lazada",
					},
				})

				assert.Nil(t, err)
				assert.Equal(t, "", res.Msg.Shop.Url)
			})
	})
}
