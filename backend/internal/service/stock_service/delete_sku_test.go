package stock_service_test

import (
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/database"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/pkgs/wargatest"
)

func TestDeleteSku(t *testing.T) {
	t.Run("cannot delete sku that has stock", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := stock_service.NewStockService(&db)

				wh, err := srv.CreateWarehouse(t.Context(), &connect.Request[stockv1.CreateWarehouseRequest]{
					Msg: &stockv1.CreateWarehouseRequest{Name: "WH-Test"},
				})
				assert.Nil(t, err)

				sku, err := srv.CreateSku(t.Context(), &connect.Request[stockv1.CreateSkuRequest]{
					Msg: &stockv1.CreateSkuRequest{
						Code:        "DEL-STOCK",
						ProductId:   1,
						BranchId:    1,
						WarehouseId: wh.Msg.Warehouse.Id,
					},
				})
				assert.Nil(t, err)

				_, err = srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
					Msg: &stockv1.CreateTransactionRequest{
						TransactionType: stockv1.TransactionType_TRANSACTION_TYPE_STOCK_IN,
						Items: []*stockv1.TransactionItem{
							{SkuId: sku.Msg.Sku.Id, Quantity: 5, Total: 10000},
						},
					},
				})
				assert.Nil(t, err)

				_, err = srv.DeleteSku(t.Context(), &connect.Request[stockv1.DeleteSkuRequest]{
					Msg: &stockv1.DeleteSkuRequest{Id: sku.Msg.Sku.Id},
				})
				assert.NotNil(t, err)
			})
	})

	t.Run("can delete sku with zero stock", func(t *testing.T) {
		var db gorm.DB
		wargatest.
			NewScenario(t, database.NewTestDatabase(&db)).
			Run(func(t *testing.T) {
				srv := stock_service.NewStockService(&db)

				wh, err := srv.CreateWarehouse(t.Context(), &connect.Request[stockv1.CreateWarehouseRequest]{
					Msg: &stockv1.CreateWarehouseRequest{Name: "WH-Test"},
				})
				assert.Nil(t, err)

				sku, err := srv.CreateSku(t.Context(), &connect.Request[stockv1.CreateSkuRequest]{
					Msg: &stockv1.CreateSkuRequest{
						Code:        "DEL-ZERO",
						ProductId:   1,
						BranchId:    1,
						WarehouseId: wh.Msg.Warehouse.Id,
					},
				})
				assert.Nil(t, err)

				_, err = srv.DeleteSku(t.Context(), &connect.Request[stockv1.DeleteSkuRequest]{
					Msg: &stockv1.DeleteSkuRequest{Id: sku.Msg.Sku.Id},
				})
				assert.Nil(t, err)
			})
	})
}
