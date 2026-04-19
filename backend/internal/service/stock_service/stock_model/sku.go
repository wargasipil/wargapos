package stock_model

import (
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

type Sku struct {
	ID           uint32              `gorm:"primaryKey;autoIncrement"`
	Code         string              `gorm:"uniqueIndex;not null;size:255"`
	ProductID    uint32              `gorm:"column:product_id;not null"`
	BranchID     uint32              `gorm:"column:branch_id;not null"`
	WarehouseID  uint32              `gorm:"column:warehouse_id;not null"`
	ProductType  int32               `gorm:"column:product_type;not null;default:0"`
	StockQty     int64               `gorm:"column:stock_qty;not null;default:0"`
	Deleted      bool                `gorm:"not null;default:false"`
	LastStockIn  *time.Time          `gorm:"column:last_stock_in"`
	LastStockOut *time.Time          `gorm:"column:last_stock_out"`
	CostingType  stockv1.CostingType `gorm:"column:costing_type;not null;default:0"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
