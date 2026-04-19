package stock_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) MovePlacement(
	ctx context.Context,
	req *connect.Request[stockv1.MovePlacementRequest],
) (*connect.Response[stockv1.MovePlacementResponse], error) {
	if req.Msg.FromRackId == req.Msg.ToRackId {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("source and destination rack must differ"))
	}

	claims := auth.ClaimsFromContext(ctx)
	var userID uint32
	if claims != nil {
		userID = claims.Identity.IdentityId
	}

	skuID := req.Msg.SkuId
	fromRackID := req.Msg.FromRackId
	toRackID := req.Msg.ToRackId
	qty := req.Msg.Qty

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Decrement source rack; fail if insufficient stock
		res := tx.Exec(
			`UPDATE rack_placements SET left_stock = left_stock - ? WHERE sku_id = ? AND rack_id = ? AND left_stock >= ?`,
			qty, skuID, fromRackID, qty,
		)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("insufficient stock or SKU not in source rack")
		}

		// Upsert destination rack
		if err := tx.Exec(`
			INSERT INTO rack_placements (sku_id, rack_id, left_stock)
			VALUES (?, ?, ?)
			ON CONFLICT (sku_id, rack_id) DO UPDATE SET left_stock = rack_placements.left_stock + excluded.left_stock
		`, skuID, toRackID, qty).Error; err != nil {
			return err
		}

		// Write placement log with MOVE type, both rack IDs set
		pl := stock_model.PlacementLog{
			SkuID:         skuID,
			FromRackID:    fromRackID,
			ToRackID:      toRackID,
			PlacementType: stockv1.PlacementType_PLACEMENT_TYPE_MOVE,
			ActorID:       userID,
			Change:        qty,
			Note:          req.Msg.Note,
			CreatedAt:     time.Now(),
		}
		return tx.Create(&pl).Error
	})
	if err != nil {
		var connectErr *connect.Error
		if errors.As(err, &connectErr) {
			return nil, connectErr
		}
		if err.Error() == "insufficient stock or SKU not in source rack" {
			return nil, connect.NewError(connect.CodeFailedPrecondition, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.MovePlacementResponse{}), nil
}
