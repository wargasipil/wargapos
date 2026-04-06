package stock_service_test

import (
	"testing"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/database"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/internal/service/stock_service/stock_core"
	"wargapos/backend/internal/service/stock_service/stock_model"
	"wargapos/backend/pkgs/wargatest"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestSkuStockProvision(t *testing.T) {
	var db gorm.DB

	wargatest.
		NewScenario(t,
			database.NewTestDatabase(&db),
		).
		Run(func(t *testing.T) {
			srv := stock_service.NewStockService(&db, nil)

			createSku, err := srv.CreateSku(t.Context(), &connect.Request[stockv1.CreateSkuRequest]{
				Msg: &stockv1.CreateSkuRequest{
					Code:        "provision-test-sku",
					ProductId:   1,
					BranchId:    1,
					WarehouseId: 1,
				},
			})
			require.Nil(t, err)
			skuId := createSku.Msg.Sku.Id

			// cv1: qty=5, unit_cost=2000 (total 10000) — created first (lower ID / earlier created_at)
			res1, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
				Msg: &stockv1.CreateTransactionRequest{
					Kind: &stockv1.CreateTransactionRequest_StockIn{
						StockIn: &stockv1.StockInCreate{
							Items: []*stockv1.TransactionItem{{SkuId: skuId, Quantity: 5, Total: 10000}},
						},
					},
				},
			})
			require.Nil(t, err)

			// cv2: qty=3, unit_cost=3000 (total 9000) — created second (higher ID / later created_at)
			res2, err := srv.CreateTransaction(t.Context(), &connect.Request[stockv1.CreateTransactionRequest]{
				Msg: &stockv1.CreateTransactionRequest{
					Kind: &stockv1.CreateTransactionRequest_StockIn{
						StockIn: &stockv1.StockInCreate{
							Items: []*stockv1.TransactionItem{{SkuId: skuId, Quantity: 3, Total: 9000}},
						},
					},
				},
			})
			require.Nil(t, err)

			var cv1, cv2 stock_model.CostVersion
			db.Where("transaction_id = ? AND sku_id = ?", res1.Msg.Transaction.Id, skuId).First(&cv1)
			db.Where("transaction_id = ? AND sku_id = ?", res2.Msg.Transaction.Id, skuId).First(&cv2)
			require.NotZero(t, cv1.ID, "cv1 should exist")
			require.NotZero(t, cv2.ID, "cv2 should exist")
			// cv1.UnitCost = 2000, cv2.UnitCost = 3000

			t.Run("FIFO: oldest (cv1) consumed first", func(t *testing.T) {
				var provision []stock_core.PriceProvision
				db.Transaction(func(tx *gorm.DB) error {
					provision, _, err = stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         6,
						CostingType: stockv1.CostingType_COSTING_TYPE_FIFO,
					})
					return err
				})
				assert.Nil(t, err)
				require.Len(t, provision, 2)
				assert.Equal(t, cv1.ID, provision[0].PriceId, "FIFO: cv1 first")
				assert.Equal(t, int32(5), provision[0].Qty)
				assert.Equal(t, cv2.ID, provision[1].PriceId, "FIFO: cv2 remainder")
				assert.Equal(t, int32(1), provision[1].Qty)
			})

			t.Run("LIFO: newest (cv2) consumed first", func(t *testing.T) {
				var provision []stock_core.PriceProvision
				db.Transaction(func(tx *gorm.DB) error {
					provision, _, err = stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         4,
						CostingType: stockv1.CostingType_COSTING_TYPE_LIFO,
					})
					return err
				})
				assert.Nil(t, err)
				require.Len(t, provision, 2)
				assert.Equal(t, cv2.ID, provision[0].PriceId, "LIFO: cv2 first")
				assert.Equal(t, int32(3), provision[0].Qty)
				assert.Equal(t, cv1.ID, provision[1].PriceId, "LIFO: cv1 remainder")
				assert.Equal(t, int32(1), provision[1].Qty)
			})

			t.Run("MAX_PRICE: highest unit_cost (cv2=3000) consumed first", func(t *testing.T) {
				var provision []stock_core.PriceProvision
				db.Transaction(func(tx *gorm.DB) error {
					provision, _, err = stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         4,
						CostingType: stockv1.CostingType_COSTING_TYPE_MAX_PRICE,
					})
					return err
				})
				assert.Nil(t, err)
				require.Len(t, provision, 2)
				assert.Equal(t, cv2.ID, provision[0].PriceId, "MAX_PRICE: cv2 (3000) first")
				assert.Equal(t, int32(3), provision[0].Qty)
				assert.Equal(t, cv1.ID, provision[1].PriceId, "MAX_PRICE: cv1 (2000) remainder")
				assert.Equal(t, int32(1), provision[1].Qty)
			})

			t.Run("MIN_PRICE: lowest unit_cost (cv1=2000) consumed first", func(t *testing.T) {
				var provision []stock_core.PriceProvision
				db.Transaction(func(tx *gorm.DB) error {
					provision, _, err = stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         6,
						CostingType: stockv1.CostingType_COSTING_TYPE_MIN_PRICE,
					})
					return err
				})
				assert.Nil(t, err)
				require.Len(t, provision, 2)
				assert.Equal(t, cv1.ID, provision[0].PriceId, "MIN_PRICE: cv1 (2000) first")
				assert.Equal(t, int32(5), provision[0].Qty)
				assert.Equal(t, cv2.ID, provision[1].PriceId, "MIN_PRICE: cv2 (3000) remainder")
				assert.Equal(t, int32(1), provision[1].Qty)
			})

			t.Run("exact fit: consumes only needed", func(t *testing.T) {
				var provision []stock_core.PriceProvision
				db.Transaction(func(tx *gorm.DB) error {
					provision, _, err = stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         3,
						CostingType: stockv1.CostingType_COSTING_TYPE_FIFO,
					})
					return err
				})
				assert.Nil(t, err)
				require.Len(t, provision, 1, "only cv1 needed for qty=3")
				assert.Equal(t, cv1.ID, provision[0].PriceId)
				assert.Equal(t, int32(3), provision[0].Qty)
			})

			t.Run("insufficient stock returns error", func(t *testing.T) {
				err := db.Transaction(func(tx *gorm.DB) error {
					_, _, e := stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         100, // only 8 total in stock
						CostingType: stockv1.CostingType_COSTING_TYPE_FIFO,
					})
					return e
				})
				assert.NotNil(t, err, "should return error when stock is insufficient")
			})

			t.Run("committed: creates stock logs and decrements left_stock", func(t *testing.T) {
				const dummyTxId uint64 = 9999

				var provision []stock_core.PriceProvision
				var commited func(uint64) (uint64, error)

				err := db.Transaction(func(tx *gorm.DB) error {
					var e error
					provision, commited, e = stock_core.SkuStockProvision(t.Context(), tx, &stock_core.SkuStockProvisionPayload{
						SkuId:       skuId,
						Qty:         5, // consume all of cv1
						CostingType: stockv1.CostingType_COSTING_TYPE_FIFO,
					})
					if e != nil {
						return e
					}

					_, e = commited(dummyTxId)
					return e
				})
				assert.Nil(t, err)
				require.Len(t, provision, 1)
				assert.Equal(t, cv1.ID, provision[0].PriceId)

				// cv1.left_stock should be decremented to 0
				var cv1After stock_model.CostVersion
				db.First(&cv1After, cv1.ID)
				assert.Equal(t, int32(0), cv1After.LeftStock, "cv1 left_stock should be 0 after full consumption")

				// stock log should be created for the provision
				var stockLog stock_model.StockLog
				db.Where("transaction_id = ? AND sku_id = ? AND log_type = ?",
					dummyTxId, skuId, stockv1.LogType_LOG_TYPE_ORDER).First(&stockLog)
				assert.NotZero(t, stockLog.ID, "stock log should be created")
				assert.Equal(t, int32(-5), stockLog.Change, "change should be negative qty")

				// sku stock_qty should be decremented: was 8 (5+3), now 3
				var skuAfter models.Sku
				db.First(&skuAfter, skuId)
				assert.Equal(t, int64(3), skuAfter.StockQty, "sku stock_qty should decrease by qty out")
				assert.NotNil(t, skuAfter.LastStockOut, "last_stock_out should be set after provision")
			})
		})
}
