package stock_model

import (
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

type Stock struct {
	ID            uint64 `gorm:"primaryKey"`
	SkuID         uint32 `gorm:"column:sku_id;not null;index"`
	TransactionID uint64 `gorm:"column:transaction_id;not null;index"`

	StockInitiate int32 `gorm:"column:stock_initiate;not null"`
	LeftStock     int32 `gorm:"column:left_stock;not null"`

	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

type StockLog struct {
	ID uint64 `gorm:"primaryKey"`

	SkuID         uint32 `gorm:"column:sku_id;not null;index:idx_stocklog_sku"`
	TransactionID uint64 `gorm:"column:transaction_id;not null;index:idx_stocklog_tx"`

	Change  int32           `gorm:"not null"` // 🔥 main field
	LogType stockv1.LogType `gorm:"type:varchar(20);not null;index"`

	ActorID        uint32 `gorm:"column:actor_id"`
	CostVersionID uint64 `gorm:"column:cost_version_id"`
	StockID        uint64 `gorm:"column:stock_id"`

	CreatedAt time.Time `gorm:"autoCreateTime"`
}
