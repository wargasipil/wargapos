package stock_model

import (
	"time"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

type StockLog struct {
	ID uint64 `gorm:"primaryKey"`

	SkuID         uint32 `gorm:"column:sku_id;not null;index:idx_stocklog_sku"`
	TransactionID uint64 `gorm:"column:transaction_id;not null;index:idx_stocklog_tx"`

	Change  int32           `gorm:"not null"`
	LogType stockv1.LogType `gorm:"type:varchar(20);not null;index"`

	ActorID uint32 `gorm:"column:actor_id"`

	CreatedAt time.Time `gorm:"autoCreateTime"`
}
