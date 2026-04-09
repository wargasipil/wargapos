package marketplace_service_test

import (
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/database"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/marketplace_service"
	"wargapos/backend/pkgs/wargatest"
)

func TestUpdateShop(t *testing.T) {
	t.Run("updates all fields", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				shop := models.MarketplaceShop{
					Name:     "Original Name",
					Type:     marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_SHOPEE,
					Username: "@original",
					URL:      "https://shopee.co.id/original",
					IsActive: true,
				}
				db.Create(&shop)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.UpdateShop(t.Context(), connect.NewRequest(&marketplacev1.UpdateShopRequest{
					Id:       shop.ID,
					Name:     "Updated Name",
					Type:     marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_TOKOPEDIA,
					Username: "@updated",
					Url:      "https://tokopedia.com/updated",
					IsActive: false,
				}))

				assert.Nil(t, err)
				assert.Equal(t, "Updated Name", res.Msg.Shop.Name)
				assert.Equal(t, marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_TOKOPEDIA, res.Msg.Shop.Type)
				assert.Equal(t, "@updated", res.Msg.Shop.Username)
				assert.Equal(t, "https://tokopedia.com/updated", res.Msg.Shop.Url)
				assert.False(t, res.Msg.Shop.IsActive)
			})
	})

	t.Run("returns NotFound for missing id", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				_, err := srv.UpdateShop(t.Context(), connect.NewRequest(&marketplacev1.UpdateShopRequest{
					Id:   999999,
					Name: "Ghost",
				}))

				assert.NotNil(t, err)
				var connectErr *connect.Error
				assert.ErrorAs(t, err, &connectErr)
				assert.Equal(t, connect.CodeNotFound, connectErr.Code())
			})
	})

	t.Run("toggle isActive", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				shop := models.MarketplaceShop{Name: "Toggle Shop", IsActive: true}
				db.Create(&shop)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.UpdateShop(t.Context(), connect.NewRequest(&marketplacev1.UpdateShopRequest{
					Id:       shop.ID,
					Name:     shop.Name,
					IsActive: false,
				}))

				assert.Nil(t, err)
				assert.False(t, res.Msg.Shop.IsActive)
			})
	})
}

func TestDeleteShop(t *testing.T) {
	t.Run("deletes existing shop", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				shop := models.MarketplaceShop{Name: "TestDelete_ToDelete", IsActive: true}
				db.Create(&shop)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				_, err := srv.DeleteShop(t.Context(), connect.NewRequest(&marketplacev1.DeleteShopRequest{
					Id: shop.ID,
				}))
				assert.Nil(t, err)

				res, err := srv.ListShops(t.Context(), connect.NewRequest(&marketplacev1.ListShopsRequest{
					Page: 1, PageSize: 20, Search: "TestDelete_",
				}))
				assert.Nil(t, err)
				assert.Equal(t, int32(0), res.Msg.Total)
			})
	})

	t.Run("delete non-existent returns no error", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				_, err := srv.DeleteShop(t.Context(), connect.NewRequest(&marketplacev1.DeleteShopRequest{
					Id: 999999,
				}))
				assert.Nil(t, err)
			})
	})
}

func TestListShops(t *testing.T) {
	t.Run("search returns empty when no match", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.ListShops(t.Context(), connect.NewRequest(&marketplacev1.ListShopsRequest{
					Page: 1, PageSize: 20, Search: "ZZZNONEXISTENT999",
				}))

				assert.Nil(t, err)
				assert.Equal(t, int32(0), res.Msg.Total)
				assert.Empty(t, res.Msg.Shops)
			})
	})

	t.Run("search filters by name", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				db.Create(&models.MarketplaceShop{Name: "TestList_Toko ABC", IsActive: true})
				db.Create(&models.MarketplaceShop{Name: "TestList_Toko XYZ", IsActive: true})
				db.Create(&models.MarketplaceShop{Name: "TestList_Warung ABC", IsActive: true})

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.ListShops(t.Context(), connect.NewRequest(&marketplacev1.ListShopsRequest{
					Page: 1, PageSize: 20, Search: "TestList_Toko",
				}))

				assert.Nil(t, err)
				assert.Equal(t, int32(2), res.Msg.Total)
				for _, s := range res.Msg.Shops {
					assert.Contains(t, s.Name, "TestList_Toko")
				}
			})
	})

	t.Run("active_only filters inactive shops", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				db.Create(&models.MarketplaceShop{Name: "TestActive_Active Shop", IsActive: true})
				inactive := models.MarketplaceShop{Name: "TestActive_Inactive Shop", IsActive: true}
				db.Create(&inactive)
				db.Model(&inactive).Update("is_active", false)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.ListShops(t.Context(), connect.NewRequest(&marketplacev1.ListShopsRequest{
					Page: 1, PageSize: 20, ActiveOnly: true, Search: "TestActive_",
				}))

				assert.Nil(t, err)
				assert.Equal(t, int32(1), res.Msg.Total)
				assert.Equal(t, "TestActive_Active Shop", res.Msg.Shops[0].Name)
			})
	})

	t.Run("pagination works", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				for i := range 5 {
					db.Create(&models.MarketplaceShop{Name: "TestPaging_Shop " + string(rune('A'+i)), IsActive: true})
				}

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				page1, err := srv.ListShops(t.Context(), connect.NewRequest(&marketplacev1.ListShopsRequest{
					Page: 1, PageSize: 2, Search: "TestPaging_",
				}))
				assert.Nil(t, err)
				assert.Equal(t, int32(5), page1.Msg.Total)
				assert.Len(t, page1.Msg.Shops, 2)

				page3, err := srv.ListShops(t.Context(), connect.NewRequest(&marketplacev1.ListShopsRequest{
					Page: 3, PageSize: 2, Search: "TestPaging_",
				}))
				assert.Nil(t, err)
				assert.Len(t, page3.Msg.Shops, 1)
			})
	})
}

func TestGetShop(t *testing.T) {
	t.Run("returns shop by id", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				shop := models.MarketplaceShop{
					Name:     "Shopee Store",
					Type:     marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_SHOPEE,
					Username: "@shopee-store",
					URL:      "https://shopee.co.id/store",
					IsActive: true,
				}
				db.Create(&shop)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.GetShop(t.Context(), connect.NewRequest(&marketplacev1.GetShopRequest{
					Id: shop.ID,
				}))

				assert.Nil(t, err)
				assert.Equal(t, shop.ID, res.Msg.Shop.Id)
				assert.Equal(t, "Shopee Store", res.Msg.Shop.Name)
				assert.Equal(t, marketplacev1.MarketplaceShopType_MARKETPLACE_SHOP_TYPE_SHOPEE, res.Msg.Shop.Type)
				assert.Equal(t, "@shopee-store", res.Msg.Shop.Username)
				assert.Equal(t, "https://shopee.co.id/store", res.Msg.Shop.Url)
				assert.True(t, res.Msg.Shop.IsActive)
			})
	})

	t.Run("returns NotFound for missing id", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				_, err := srv.GetShop(t.Context(), connect.NewRequest(&marketplacev1.GetShopRequest{
					Id: 999999,
				}))

				assert.NotNil(t, err)
				var connectErr *connect.Error
				assert.ErrorAs(t, err, &connectErr)
				assert.Equal(t, connect.CodeNotFound, connectErr.Code())
			})
	})
}
