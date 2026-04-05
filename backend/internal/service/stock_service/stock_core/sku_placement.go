package stock_core

import (
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"

	"gorm.io/gorm"
)

type AddPlacementPayload struct {
	placements []*stockv1.StockInPlacementPayload
}

func AddPlacements(db *gorm.DB, placements []*stockv1.StockInPlacementPayload) error {
	var err error

	// getting default rack

	// adding log
	// for _, place := range placements {

	// 	// updating placement
	// }

	return err
}
