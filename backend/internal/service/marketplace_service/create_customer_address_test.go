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

func TestCreateCustomerAddress(t *testing.T) {
	t.Run("creates address with all fields", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				customer := models.MarketplaceCustomer{Name: "Budi", PhoneNumber: "08123456789"}
				db.Create(&customer)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.CreateCustomerAddress(t.Context(), connect.NewRequest(&marketplacev1.CreateCustomerAddressRequest{
					CustomerId: customer.ID,
					Label:      "Home",
					Address:    "Jl. Merdeka No. 10",
					City:       "Jakarta",
					Province:   "DKI Jakarta",
					PostalCode: "10110",
				}))

				assert.Nil(t, err)
				assert.NotNil(t, res.Msg.Address)
				assert.NotZero(t, res.Msg.Address.Id)
				assert.Equal(t, customer.ID, res.Msg.Address.CustomerId)
				assert.Equal(t, "Home", res.Msg.Address.Label)
				assert.Equal(t, "Jl. Merdeka No. 10", res.Msg.Address.Address)
				assert.Equal(t, "Jakarta", res.Msg.Address.City)
				assert.Equal(t, "DKI Jakarta", res.Msg.Address.Province)
				assert.Equal(t, "10110", res.Msg.Address.PostalCode)
			})
	})

	t.Run("creates address with only required field", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				customer := models.MarketplaceCustomer{Name: "Siti"}
				db.Create(&customer)

				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				res, err := srv.CreateCustomerAddress(t.Context(), connect.NewRequest(&marketplacev1.CreateCustomerAddressRequest{
					CustomerId: customer.ID,
					Address:    "Jl. Sudirman No. 5",
				}))

				assert.Nil(t, err)
				assert.NotZero(t, res.Msg.Address.Id)
				assert.Equal(t, "Jl. Sudirman No. 5", res.Msg.Address.Address)
				assert.Equal(t, "", res.Msg.Address.Label)
				assert.Equal(t, "", res.Msg.Address.City)
			})
	})

	t.Run("returns InvalidArgument when address is empty", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := marketplace_service.NewMarketplaceService(nil, &db, nil)

				_, err := srv.CreateCustomerAddress(t.Context(), connect.NewRequest(&marketplacev1.CreateCustomerAddressRequest{
					CustomerId: 1,
					Label:      "Work",
					Address:    "",
				}))

				assert.NotNil(t, err)
				var connectErr *connect.Error
				assert.ErrorAs(t, err, &connectErr)
				assert.Equal(t, connect.CodeInvalidArgument, connectErr.Code())
			})
	})
}
