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

func (s *StockService) AdjustPlacement(
	ctx context.Context,
	req *connect.Request[stockv1.AdjustPlacementRequest],
) (*connect.Response[stockv1.AdjustPlacementResponse], error) {
	claims := auth.ClaimsFromContext(ctx)
	var userID uint32
	if claims != nil {
		userID = claims.Identity.IdentityId
	}

	change := req.Msg.Change
	// Auto-negate for BROKEN and LOST
	if req.Msg.PlacementType == stockv1.PlacementType_PLACEMENT_TYPE_BROKEN ||
		req.Msg.PlacementType == stockv1.PlacementType_PLACEMENT_TYPE_LOST {
		if change > 0 {
			change = -change
		}
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Upsert rack_placement
		if err := tx.Exec(`
			INSERT INTO rack_placements (sku_id, rack_id, left_stock)
			VALUES (?, ?, ?)
			ON CONFLICT (sku_id, rack_id) DO UPDATE SET left_stock = rack_placements.left_stock + excluded.left_stock
		`, req.Msg.SkuId, req.Msg.RackId, change).Error; err != nil {
			return err
		}

		// Write placement_log
		pl := stock_model.PlacementLog{
			SkuID:         req.Msg.SkuId,
			ToRackID:      req.Msg.RackId,
			PlacementType: int16(req.Msg.PlacementType),
			ActorID:       userID,
			Change:        change,
			Note:          req.Msg.Note,
			CreatedAt:     time.Now(),
		}
		if err := tx.Create(&pl).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("rack or SKU not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.AdjustPlacementResponse{}), nil
}
