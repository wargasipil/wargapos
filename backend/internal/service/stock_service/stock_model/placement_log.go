package stock_model

import (
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

type PlacementLog struct {
	ID            uint64                `gorm:"primaryKey;autoIncrement"`
	SkuID         uint32                `gorm:"not null"`
	FromRackID    uint32                `gorm:"not null;default:0"`
	ToRackID      uint32                `gorm:"not null;default:0"`
	PlacementType stockv1.PlacementType `gorm:"not null;default:0"`
	TransactionID uint64                `gorm:"not null;default:0"`
	ActorID       uint32                `gorm:"not null;default:0"`
	Change        int32                 `gorm:"not null;default:0"`
	Note          string                `gorm:"not null;default:''"`
	CreatedAt     time.Time
}
