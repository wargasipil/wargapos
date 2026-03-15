package stock_service

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/models"
)

func (s *StockService) AdjustStock(
	ctx context.Context,
	req *connect.Request[stockv1.AdjustStockRequest],
) (*connect.Response[stockv1.AdjustStockResponse], error) {
	if req.Msg.ProductId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("product_id is required"))
	}
	if req.Msg.Delta == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("delta must be non-zero"))
	}
	reason := req.Msg.Reason
	if reason != "restock" && reason != "adjustment" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("reason must be 'restock' or 'adjustment'"))
	}

	claims := auth.ClaimsFromContext(ctx)

	var newStock int32
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Apply delta atomically.
		res := tx.Model(&models.Product{}).
			Where("id = ?", req.Msg.ProductId).
			Update("stock_qty", gorm.Expr("stock_qty + ?", req.Msg.Delta))
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("product not found")
		}

		// Reload to get the new value and validate it's non-negative.
		var p models.Product
		if err := tx.Select("stock_qty").First(&p, req.Msg.ProductId).Error; err != nil {
			return err
		}
		if p.StockQty < 0 {
			return fmt.Errorf("insufficient stock: would result in %d", p.StockQty)
		}
		newStock = p.StockQty

		// Record the movement.
		var createdBy *int64
		if claims != nil {
			uid := claims.UserID
			createdBy = &uid
		}
		mov := &models.StockMovement{
			ProductID: req.Msg.ProductId,
			Delta:     req.Msg.Delta,
			Reason:    reason,
			Note:      req.Msg.Note,
			CreatedBy: createdBy,
		}
		return tx.Create(mov).Error
	})
	if txErr != nil {
		if errors.Is(txErr, errors.New("product not found")) {
			return nil, connect.NewError(connect.CodeNotFound, txErr)
		}
		return nil, connect.NewError(connect.CodeInternal, txErr)
	}

	return connect.NewResponse(&stockv1.AdjustStockResponse{NewStockQty: newStock}), nil
}
