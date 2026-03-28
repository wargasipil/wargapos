package stock_model

type RackPlacement struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement"`
	SkuID     uint32 `gorm:"column:sku_id;not null;uniqueIndex:sku_rack"`
	RackID    uint32 `gorm:"column:rack_id;not null;uniqueIndex:sku_rack"`
	LeftStock int32  `gorm:"column:left_stock;not null;default:0"`
}
