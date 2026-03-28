package stock_model

import "time"

type PriceVersion struct {
	ID            uint64 `gorm:"primaryKey;autoIncrement"`
	SkuId         uint32 `gorm:"not null;index"`
	TransactionId uint64 `gorm:"not null;index"`

	CreatedAt time.Time
	UpdatedAt time.Time

	Price         float64 `gorm:"not null"`
	StockInitiate int32   `gorm:"not null"`
	LeftStock     int32   `gorm:"not null"`
}
