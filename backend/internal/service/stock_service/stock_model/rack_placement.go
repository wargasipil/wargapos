package stock_model

import (
	"time"
)

type Rack struct {
	ID          uint32 `gorm:"primaryKey;autoIncrement"`
	WarehouseID uint32 `gorm:"column:warehouse_id;not null"`
	Name        string `gorm:"not null;size:300"`
	Deleted     bool   `gorm:"not null;default:false"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type RackPlacement struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement"`
	SkuID     uint32 `gorm:"column:sku_id;not null;uniqueIndex:sku_rack"`
	RackID    uint32 `gorm:"column:rack_id;not null;uniqueIndex:sku_rack"`
	LeftStock int32  `gorm:"column:left_stock;not null;default:0"`
	UpdatedAt time.Time
	CreatedAt time.Time
}
