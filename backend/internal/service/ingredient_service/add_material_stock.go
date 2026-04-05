package ingredient_service

import (
	"context"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) AddMaterialStock(
	ctx context.Context,
	req *connect.Request[ingredientv1.AddMaterialStockRequest],
) (*connect.Response[ingredientv1.AddMaterialStockResponse], error) {
	var err error
	pay := req.Msg
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// get material

		var material models.Material
		err = tx.
			Clauses(clause.Locking{
				Strength: "UPDATE",
			}).
			Model(&models.Material{}).
			First(&material, pay.Id).
			Error

		if err != nil {
			return err
		}

		// get sku
		var sku *stockv1.Sku

		getSku, err := s.stockSrv.GetSku(ctx, &connect.Request[stockv1.GetSkuRequest]{
			Msg: &stockv1.GetSkuRequest{
				Identifier: &stockv1.GetSkuRequest_Code{
					Code: material.Code,
				},
			},
		})

		if err != nil {
			return err
		}

		var branchId uint32
		if material.BranchID != nil {
			branchId = *material.BranchID
		}

		// creating sku jika not found
		if getSku.Msg.ErrCode == stockv1.SkuError_SKU_ERROR_NOTFOUND {
			createdSku, err := s.stockSrv.CreateSku(ctx, &connect.Request[stockv1.CreateSkuRequest]{
				Msg: &stockv1.CreateSkuRequest{
					Code:        material.Code,
					ProductId:   material.ID,
					BranchId:    branchId,
					WarehouseId: pay.WarehouseId,
					ProductType: stockv1.ProductType_PRODUCT_TYPE_MATERIAL,
				},
			})

			if err != nil {
				return err
			}

			sku = createdSku.Msg.Sku
		} else {
			sku = getSku.Msg.Sku
		}

		if pay.Qty > 0 {
			// Stock addition: create STOCK_IN transaction (no rack placement for ingredients)
			_, err = s.stockSrv.CreateTransaction(ctx, &connect.Request[stockv1.CreateTransactionRequest]{
				Msg: &stockv1.CreateTransactionRequest{
					Kind: &stockv1.CreateTransactionRequest_StockIn{
						StockIn: &stockv1.StockInCreate{},
					},
					Note: pay.Note,
					Items: []*stockv1.TransactionItem{
						{SkuId: sku.Id, Quantity: pay.Qty, Total: float64(pay.Price)},
					},
				},
			})
			if err != nil {
				return err
			}
		} else if pay.Qty < 0 {
			// Stock reduction: adjust sku.stock_qty directly (no rack context for ingredients)
			if err := tx.Model(&models.Sku{}).
				Where("id = ?", sku.Id).
				Update("stock_qty", gorm.Expr("stock_qty + ?", pay.Qty)).Error; err != nil {
				return err
			}
		}

		// adjust stock material
		err = tx.
			Model(&models.Material{}).
			Where("id = ?", material.ID).
			Update("qty", gorm.Expr("qty + ?", pay.Qty)).
			Error

		if err != nil {
			return err
		}

		return nil
	})

	return connect.NewResponse(&ingredientv1.AddMaterialStockResponse{}), err
}
