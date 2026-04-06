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
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestCreateOrderTransaction(t *testing.T) {
	var db gorm.DB

	wargatest.
		NewScenario(t,
			database.NewTestDatabase(&db),
		).
		Run(func(t *testing.T) {
			srv := stock_service.NewStockService(&db, nil)

			// create a SKU and stock in 10 units
			createSku, err := srv.CreateSku(t.Context(), &connect.Request[stockv1.CreateSkuRequest]{
				Msg: &stockv1.CreateSkuRequest{
					Code:        "order-test-sku",
					ProductId:   1,
					BranchId:    1,
					WarehouseId: 1,
				},
			})
			require.Nil(t, err)
			skuId := createSku.Msg.Sku.Id

			_, err = srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
				Msg: &stockv1.CreateTransactionRequest{
					Kind: &stockv1.CreateTransactionRequest_StockIn{
						StockIn: &stockv1.StockInCreate{
							Items: []*stockv1.TransactionItem{
								{SkuId: skuId, Quantity: 10, Total: 50000},
							},
						},
					},
				},
			})
			require.Nil(t, err)

			t.Run("happy path: deducts stock and stores receipt", func(t *testing.T) {
				res, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
					Msg: &stockv1.CreateTransactionRequest{
						Kind: &stockv1.CreateTransactionRequest_Order{
							Order: &stockv1.OrderCreate{
								Receipt:     "RCP-001",
								ReceiptFile: "/receipts/rcp-001.pdf",
								Items: []*stockv1.TransactionItem{
									{SkuId: skuId, Quantity: 3, Total: 15000},
								},
							},
						},
						Note: "test order",
					},
				})
				require.Nil(t, err)

				txId := res.Msg.Transaction.Id

				// transaction type must be ORDER, placement status REVIEW
				assert.Equal(t, stockv1.TransactionType_TRANSACTION_TYPE_ORDER, res.Msg.Transaction.TransactionType)
				assert.Equal(t, stockv1.PlacementStatus_PLACEMENT_STATUS_REVIEW, res.Msg.Transaction.PlacementStatus)

				// receipt fields returned in response
				assert.Equal(t, "RCP-001", res.Msg.Transaction.Receipt)
				assert.Equal(t, "/receipts/rcp-001.pdf", res.Msg.Transaction.ReceiptFile)

				// receipt stored in DB
				var txRecord models.StockTransaction
				db.First(&txRecord, txId)
				assert.Equal(t, "RCP-001", txRecord.Receipt)
				assert.Equal(t, "/receipts/rcp-001.pdf", txRecord.ReceiptFile)
				assert.InDelta(t, 15000.0, txRecord.Total, 0.01)

				// sku stock_qty decremented: 10 - 3 = 7
				var sku models.Sku
				db.First(&sku, skuId)
				assert.Equal(t, int64(7), sku.StockQty)
				assert.NotNil(t, sku.LastStockOut)

				// stock log with LOG_TYPE_ORDER created
				var stockLog stock_model.StockLog
				r := db.Where("transaction_id = ? AND sku_id = ? AND log_type = ?",
					txId, skuId, stockv1.LogType_LOG_TYPE_ORDER).First(&stockLog)
				assert.Nil(t, r.Error)
				assert.Equal(t, int32(-3), stockLog.Change)

				// cost_version.left_stock decremented
				var cv stock_model.CostVersion
				db.Where("sku_id = ?", skuId).Order("id asc").First(&cv)
				assert.Equal(t, int32(7), cv.LeftStock)
			})

			t.Run("insufficient stock returns FailedPrecondition", func(t *testing.T) {
				_, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
					Msg: &stockv1.CreateTransactionRequest{
						Kind: &stockv1.CreateTransactionRequest_Order{
							Order: &stockv1.OrderCreate{
								Receipt:     "RCP-002",
								ReceiptFile: "/receipts/rcp-002.pdf",
								Items: []*stockv1.TransactionItem{
									{SkuId: skuId, Quantity: 100, Total: 500000},
								},
							},
						},
					},
				})
				require.NotNil(t, err)
				var connectErr *connect.Error
				require.ErrorAs(t, err, &connectErr)
				assert.Equal(t, connect.CodeFailedPrecondition, connectErr.Code())
			})

			t.Run("multi-item order: both SKUs deducted, total summed", func(t *testing.T) {
				// create a second SKU with stock
				createSku2, err := srv.CreateSku(t.Context(), &connect.Request[stockv1.CreateSkuRequest]{
					Msg: &stockv1.CreateSkuRequest{
						Code:        "order-test-sku-2",
						ProductId:   2,
						BranchId:    1,
						WarehouseId: 1,
					},
				})
				require.Nil(t, err)
				skuId2 := createSku2.Msg.Sku.Id

				_, err = srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
					Msg: &stockv1.CreateTransactionRequest{
						Kind: &stockv1.CreateTransactionRequest_StockIn{
							StockIn: &stockv1.StockInCreate{
								Items: []*stockv1.TransactionItem{
									{SkuId: skuId2, Quantity: 5, Total: 25000},
								},
							},
						},
					},
				})
				require.Nil(t, err)

				res, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
					Msg: &stockv1.CreateTransactionRequest{
						Kind: &stockv1.CreateTransactionRequest_Order{
							Order: &stockv1.OrderCreate{
								Receipt:     "RCP-003",
								ReceiptFile: "/receipts/rcp-003.pdf",
								Items: []*stockv1.TransactionItem{
									{SkuId: skuId, Quantity: 2, Total: 10000},
									{SkuId: skuId2, Quantity: 3, Total: 15000},
								},
							},
						},
					},
				})
				require.Nil(t, err)

				var txRecord models.StockTransaction
				db.First(&txRecord, res.Msg.Transaction.Id)
				assert.InDelta(t, 25000.0, txRecord.Total, 0.01)

				var sku1 models.Sku
				db.First(&sku1, skuId)
				assert.Equal(t, int64(5), sku1.StockQty) // was 7, minus 2

				var sku2 models.Sku
				db.First(&sku2, skuId2)
				assert.Equal(t, int64(2), sku2.StockQty) // was 5, minus 3
			})
		})
}
