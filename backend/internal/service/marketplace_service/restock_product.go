package marketplace_service

import (
	"context"
	"fmt"
	"time"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *MarketplaceService) RestockProduct(
	ctx context.Context,
	req *connect.Request[marketplacev1.RestockProductRequest],
) (*connect.Response[marketplacev1.RestockProductResponse], error) {
	var err error

	productID := req.Msg.ProductId
	warehouseID := req.Msg.WarehouseId
	delta := req.Msg.Delta
	total := req.Msg.Total

	var product models.MarketplaceProduct
	var skuID uint32

	db := s.db.WithContext(ctx)

	err = db.Transaction(func(tx *gorm.DB) error {

		// 1. Verify product exists

		err := tx.
			Clauses(clause.Locking{
				Strength: "UPDATE",
			}).
			First(&product, productID).
			Error

		if err != nil {
			return connect.NewError(connect.CodeNotFound, err)
		}

		// 2. Get or create SKU
		skuCode := fmt.Sprintf("MP-%d-%d", productID, warehouseID)
		getSku, err := s.stockSrv.GetSku(ctx, &connect.Request[stockv1.GetSkuRequest]{
			Msg: &stockv1.GetSkuRequest{
				Identifier: &stockv1.GetSkuRequest_Code{Code: skuCode},
			},
		})
		if err != nil {
			return err
		}

		if getSku.Msg.ErrCode == stockv1.SkuError_SKU_ERROR_NOTFOUND {
			created, err := s.stockSrv.CreateSku(ctx, &connect.Request[stockv1.CreateSkuRequest]{
				Msg: &stockv1.CreateSkuRequest{
					Code:        skuCode,
					ProductId:   uint32(productID),
					WarehouseId: warehouseID,
					BranchId:    0,
					ProductType: stockv1.ProductType_PRODUCT_TYPE_MARKETPLACE_PRODUCT,
				},
			})
			if err != nil {
				return err
			}
			skuID = created.Msg.Sku.Id

			// creating marketplace product stock
			stock := models.MarketplaceProductStock{
				MarketplaceProductID: productID,
				WarehouseID:          warehouseID,
				SkuID:                skuID,
				CreatedAt:            time.Now(),
				UpdatedAt:            time.Now(),
			}

			err = tx.Create(&stock).Error
			if err != nil {
				return err
			}

		} else {
			skuID = getSku.Msg.Sku.Id
		}

		return nil
	})

	// 3. Get or create the "Preview" rack for this warehouse
	rackResp, err := s.stockSrv.GetRack(ctx, &connect.Request[stockv1.GetRackRequest]{
		Msg: &stockv1.GetRackRequest{
			By: &stockv1.GetRackRequest_Name{
				Name: &stockv1.GetRackByName{
					WarehouseId: warehouseID,
					Name:        "Preview",
				},
			},
			CreateIfNotFound: true,
		},
	})
	if err != nil {
		return nil, err
	}
	rackID := rackResp.Msg.Rack.Id

	// 4. Create STOCK_IN transaction with Preview rack placement
	_, err = s.stockSrv.CreateTransaction(ctx, &connect.Request[stockv1.CreateTransactionRequest]{
		Msg: &stockv1.CreateTransactionRequest{
			Kind: &stockv1.CreateTransactionRequest_StockIn{
				StockIn: &stockv1.StockInCreate{
					Placement: []*stockv1.StockInPlacementPayload{
						{RackId: rackID, SkuId: skuID, Count: delta},
					},
					Items: []*stockv1.TransactionItem{
						{SkuId: skuID, Quantity: delta, Total: total},
					},
				},
			},
		},
	})
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&marketplacev1.RestockProductResponse{
		Product: toProductProto(product),
	}), nil
}
