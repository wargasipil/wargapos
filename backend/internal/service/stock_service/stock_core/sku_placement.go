package stock_core

import (
	"fmt"
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"

	"gorm.io/gorm"
)

func AddPlacements(tx *gorm.DB, transactionId uint64, actorId uint32, placements []*stockv1.StockInPlacementPayload) ([]*stock_model.PlacementLog, error) {
	var err error
	var logs []*stock_model.PlacementLog = []*stock_model.PlacementLog{}

	// getting default rack
	for _, p := range placements {
		err = tx.
			Exec(
				`
				INSERT INTO rack_placements (sku_id, rack_id, left_stock, created_at)
				VALUES (?, ?, ?, now())
				ON CONFLICT (sku_id, rack_id) DO UPDATE SET left_stock = rack_placements.left_stock + excluded.left_stock, updated_at = now()
				`,
				p.SkuId,
				p.RackId,
				p.Count,
			).
			Error

		if err != nil {
			return logs, err
		}

		pl := stock_model.PlacementLog{
			SkuID:         p.SkuId,
			ToRackID:      p.RackId,
			PlacementType: stockv1.PlacementType_PLACEMENT_TYPE_IN,
			TransactionID: transactionId,
			ActorID:       actorId,
			Change:        p.Count,
			CreatedAt:     time.Now(),
		}

		err = tx.Create(&pl).Error
		if err != nil {
			return logs, err
		}

		logs = append(logs, &pl)

	}

	return logs, err
}

func MovePlacements(tx *gorm.DB, transactionId uint64, actorId uint32, placements []*stockv1.MovePayload) ([]*stock_model.PlacementLog, error) {
	var err error
	var logs []*stock_model.PlacementLog = []*stock_model.PlacementLog{}
	for _, p := range placements {
		var placement stock_model.RackPlacement
		err = tx.
			Model(&stock_model.RackPlacement{}).
			Where("sku_id = ?", p.SkuId).
			Where("rack_id = ?", p.FromRackId).
			First(&placement).
			Error

		if err != nil {
			return logs, err
		}

		if p.Change > placement.LeftStock {
			var rack stock_model.Rack
			err = tx.
				Model(rack).
				First(&rack).
				Error
			if err != nil {
				return logs, err
			}

			return logs, fmt.Errorf("rack %s change invalid", rack.Name)
		}

		err = tx.
			Model(&stock_model.RackPlacement{}).
			Where("sku_id = ?", p.SkuId).
			Where("rack_id = ?", p.FromRackId).
			Updates(map[string]interface{}{
				"left_stock": gorm.Expr("left_stock - ?", p.Change),
			}).
			Error

		if err != nil {
			return logs, err
		}

		// to rack
		err = tx.
			Exec(
				`
				INSERT INTO rack_placements (sku_id, rack_id, left_stock, created_at)
				VALUES (?, ?, ?, now())
				ON CONFLICT (sku_id, rack_id) DO UPDATE SET left_stock = rack_placements.left_stock + excluded.left_stock, updated_at = now()
				`,
				p.SkuId,
				p.ToRackId,
				p.Change,
			).
			Error

		if err != nil {
			return logs, err
		}

		pl := stock_model.PlacementLog{
			SkuID:         p.SkuId,
			FromRackID:    p.FromRackId,
			ToRackID:      p.ToRackId,
			PlacementType: stockv1.PlacementType_PLACEMENT_TYPE_MOVE,
			TransactionID: transactionId,
			ActorID:       actorId,
			Change:        p.Change,
			CreatedAt:     time.Now(),
		}

		err = tx.Create(&pl).Error
		if err != nil {
			return logs, err
		}

		logs = append(logs, &pl)

	}

	return logs, err
}

func ProblemPlacements(tx *gorm.DB, transactionId uint64, actorId uint32, problems []*stockv1.ProblemPayload) ([]*stock_model.PlacementLog, error) {
	var err error
	var logs []*stock_model.PlacementLog = []*stock_model.PlacementLog{}

	// getting default rack
	for _, p := range problems {
		var placement stock_model.RackPlacement
		err = tx.
			Model(&stock_model.RackPlacement{}).
			Where("sku_id = ?", p.SkuId).
			Where("rack_id = ?", p.RackId).
			First(&placement).
			Error

		if err != nil {
			return logs, err
		}

		if p.Count > placement.LeftStock {
			var rack stock_model.Rack
			err = tx.
				Model(rack).
				First(&rack).
				Error
			if err != nil {
				return logs, err
			}

			return logs, fmt.Errorf("rack %s problem invalid", rack.Name)
		}

		err = tx.
			Model(&stock_model.RackPlacement{}).
			Where("sku_id = ?", p.SkuId).
			Where("rack_id = ?", p.RackId).
			Updates(map[string]interface{}{
				"left_stock": gorm.Expr("left_stock - ?", p.Count),
			}).
			Error

		if err != nil {
			return logs, err
		}

		pl := stock_model.PlacementLog{
			SkuID:         p.SkuId,
			ToRackID:      p.RackId,
			PlacementType: p.Type,
			TransactionID: transactionId,
			ActorID:       actorId,
			Change:        p.Count,
			CreatedAt:     time.Now(),
		}

		err = tx.Create(&pl).Error
		if err != nil {
			return logs, err
		}

		logs = append(logs, &pl)

	}

	return logs, err
}
