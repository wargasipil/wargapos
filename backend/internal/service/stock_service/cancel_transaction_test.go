package stock_service_test

import (
	"testing"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/database"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/internal/service/stock_service/stock_model"
	"wargapos/backend/pkgs/wargatest"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestCancelTransaction(t *testing.T) {
	var db gorm.DB

	wargatest.
		NewScenario(t,
			database.NewTestDatabase(&db),
		).
		Run(func(t *testing.T) {
			srv := stock_service.NewStockService(&db, nil)

			t.Run("create sku", func(t *testing.T) {
				createSku, err := srv.CreateSku(t.Context(), &connect.Request[stockv1.CreateSkuRequest]{
					Msg: &stockv1.CreateSkuRequest{
						Code:        "cancel-test-sku",
						ProductId:   1,
						BranchId:    1,
						WarehouseId: 1,
					},
				})
				assert.Nil(t, err)

				t.Run("stock in then cancel", func(t *testing.T) {
					res, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
						Msg: &stockv1.CreateTransactionRequest{
							Kind: &stockv1.CreateTransactionRequest_StockIn{
								StockIn: &stockv1.StockInCreate{},
							},
							Items: []*stockv1.TransactionItem{
								{
									SkuId:    createSku.Msg.Sku.Id,
									Quantity: 5,
									Total:    10000,
								},
							},
						},
					})
					assert.Nil(t, err)

					txId := res.Msg.Transaction.Id
					skuId := createSku.Msg.Sku.Id

					_, err = srv.CancelTransaction(t.Context(), &connect.Request[stockv1.CancelTransactionRequest]{
						Msg: &stockv1.CancelTransactionRequest{
							TransactionId: txId,
						},
					})
					assert.Nil(t, err)

					// ensure status
					var txRecord models.StockTransaction
					db.First(&txRecord, txId)
					assert.True(t, txRecord.Cancelled, "transaction should be cancelled")

					// ensure cost version left_stock 0
					var costVersion stock_model.CostVersion
					db.Where("transaction_id = ? AND sku_id = ?", txId, skuId).First(&costVersion)
					assert.Equal(t, int32(0), costVersion.LeftStock, "cost version left_stock should be 0 after cancel")

					// ensure sku stock_qty rolled back to 0
					var sku models.Sku
					db.First(&sku, skuId)
					assert.Equal(t, int64(0), sku.StockQty, "sku stock_qty should be 0 after cancel")
				})
			})
		})
}
