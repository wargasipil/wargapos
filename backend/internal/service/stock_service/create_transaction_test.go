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

func TestCreateTransaction(t *testing.T) {
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
						Code:        "aadc",
						ProductId:   1,
						BranchId:    1,
						WarehouseId: 1,
					},
				})

				assert.Nil(t, err)

				t.Run("create stock in", func(t *testing.T) {
					res, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
						Msg: &stockv1.CreateTransactionRequest{
							TransactionType: stockv1.TransactionType_TRANSACTION_TYPE_STOCK_IN,
							Items: []*stockv1.TransactionItem{
								{
									SkuId:    createSku.Msg.Sku.Id,
									Quantity: 9,
									Total:    12000,
								},
							},
						},
					})

					assert.Nil(t, err)

					var sku models.Sku
					db.First(&sku, createSku.Msg.Sku.Id)
					assert.NotNil(t, sku.LastStockIn, "last_stock_in should be set after stock in")
					assert.Equal(t, int64(9), sku.StockQty, "sku stock_qty should match quantity added")

					txId := res.Msg.Transaction.Id
					skuId := createSku.Msg.Sku.Id

					// ensure cost version
					var costVersion stock_model.CostVersion
					r := db.Where("transaction_id = ? AND sku_id = ?", txId, skuId).First(&costVersion)
					assert.Nil(t, r.Error, "cost version query error")
					assert.NotZero(t, costVersion.ID, "cost version should be created")
					assert.Equal(t, int32(9), costVersion.StockInitiate)
					assert.Equal(t, int32(9), costVersion.LeftStock)
					assert.InDelta(t, 12000.0/9, costVersion.UnitCost, 0.01)

					// ensure stock log
					var stockLog stock_model.StockLog
					r = db.Where("transaction_id = ? AND sku_id = ?", txId, skuId).First(&stockLog)
					assert.Nil(t, r.Error, "stock log query error")
					assert.NotZero(t, stockLog.ID, "stock log should be created")
					assert.Equal(t, int32(9), stockLog.Change)
					assert.Equal(t, stockv1.LogType_LOG_TYPE_STOCK_IN, stockLog.LogType)
				})
			})

		})

}
