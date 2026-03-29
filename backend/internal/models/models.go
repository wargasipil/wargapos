package models

import (
	"time"
	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

type User struct {
	ID           uint32  `gorm:"primaryKey;autoIncrement"`
	Username     string  `gorm:"uniqueIndex;not null;size:100"`
	FullName     string  `gorm:"not null;size:255"`
	Email        string  `gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string  `gorm:"not null;size:255"`
	Role         string  `gorm:"not null;default:cashier;size:20"`
	IsActive     bool    `gorm:"not null;default:true"`
	ImageURL     *string `gorm:"column:image_url"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Category struct {
	ID        int64  `gorm:"primaryKey;autoIncrement"`
	Name      string `gorm:"uniqueIndex;not null;size:255"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Product struct {
	ID          int64   `gorm:"primaryKey;autoIncrement"`
	Name        string  `gorm:"not null;size:255"`
	Description string  `gorm:"type:text"`
	CategoryID  *int64  `gorm:"type:bigint"`
	PriceCents  int64   `gorm:"not null;default:0"`
	CogsCents   int64   `gorm:"not null;default:0"`
	IsActive    bool    `gorm:"not null;default:true"`
	SKU         string  `gorm:"uniqueIndex;not null;size:100;column:sku"`
	ImageURL    *string `gorm:"column:image_url"`
	StockQty    int32   `gorm:"column:stock_qty;not null;default:0"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type StockMovement struct {
	ID        int64   `gorm:"primaryKey;autoIncrement"`
	ProductID int64   `gorm:"column:product_id;not null"`
	Delta     int32   `gorm:"column:delta;not null"`
	Reason    string  `gorm:"column:reason;not null"`
	Note      string  `gorm:"column:note;not null;default:''"`
	CreatedBy *uint32 `gorm:"column:created_by"`
	CreatedAt time.Time
}

type Order struct {
	ID                int64       `gorm:"primaryKey;autoIncrement"`
	SessionToken      *string     `gorm:"column:session_token;uniqueIndex"`
	CashierID         *uint32     `gorm:"type:integer"`
	TotalCents        int64       `gorm:"not null;default:0"`
	Status            int32       `gorm:"not null;default:1"`
	PaymentMethod     *int32      `gorm:"column:payment_method"`
	TableID           *int64      `gorm:"column:table_id;type:bigint"`
	SnapToken         *string     `gorm:"column:snap_token"`
	CustomerName      *string     `gorm:"column:customer_name"`
	PhoneNumber       *string     `gorm:"column:phone_number"`
	OrderFrom         int32       `gorm:"column:order_from;not null;default:0"`
	PaymentStatus     int32       `gorm:"column:payment_status;not null;default:1"`
	CashTenderedCents *int64      `gorm:"column:cash_tendered_cents"`
	ChangeCents       *int64      `gorm:"column:change_cents"`
	Items             []OrderItem `gorm:"foreignKey:OrderID"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Table struct {
	ID        int64  `gorm:"primaryKey;autoIncrement"`
	Name      string `gorm:"not null"`
	UUID      string `gorm:"column:uuid;not null;uniqueIndex"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type OrderItem struct {
	ID             int64   `gorm:"primaryKey;autoIncrement"`
	OrderID        int64   `gorm:"not null"`
	ProductID      *int64  `gorm:"type:bigint"`
	ProductName    string  `gorm:"not null;size:255"`
	Quantity       int32   `gorm:"not null"`
	UnitPriceCents int64   `gorm:"not null"`
	SubtotalCents  int64   `gorm:"not null"`
	Notes          *string `gorm:"column:notes"`
	CreatedAt      time.Time
}

type Notification struct {
	ID        int64     `gorm:"primaryKey;autoIncrement"`
	Type      int16     `gorm:"column:type;not null"`
	Title     string    `gorm:"column:title;type:text;not null"`
	Body      string    `gorm:"column:body;type:text;not null;default:''"`
	OrderID   *int64    `gorm:"column:order_id"`
	IsRead    bool      `gorm:"column:is_read;not null;default:false"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

type AppSettings struct {
	ID                   int        `gorm:"primaryKey;autoIncrement"`
	MidtransServerKey    string     `gorm:"column:midtrans_server_key;not null;default:''"`
	MidtransClientKey    string     `gorm:"column:midtrans_client_key;not null;default:''"`
	MidtransEnvironment  string     `gorm:"column:midtrans_environment;not null;default:'sandbox'"`
	BankName             string     `gorm:"column:bank_name;not null;default:''"`
	BankAccountNumber    string     `gorm:"column:bank_account_number;not null;default:''"`
	BankAccountName      string     `gorm:"column:bank_account_name;not null;default:''"`
	QrisImageUrl         string     `gorm:"column:qris_image_url;not null;default:''"`
	PrinterTitle         string     `gorm:"column:printer_title;not null;default:''"`
	PrinterDescription   string     `gorm:"column:printer_description;not null;default:''"`
	PrinterAddress       string     `gorm:"column:printer_address;not null;default:''"`
	PrinterAddress2      string     `gorm:"column:printer_address2;not null;default:''"`
	PrinterContact       string     `gorm:"column:printer_contact;not null;default:''"`
	PrinterFooter        string     `gorm:"column:printer_footer;not null;default:''"`
	PrinterMode          int32      `gorm:"column:printer_mode;not null;default:0"`
	BackupEnabled        bool       `gorm:"column:backup_enabled;not null;default:false"`
	BackupIntervalHours  int32      `gorm:"column:backup_interval_hours;not null;default:24"`
	BackupRetentionCount int32      `gorm:"column:backup_retention_count;not null;default:7"`
	BackupDir            string     `gorm:"column:backup_dir;not null;default:'./backups'"`
	BackupLastAt         *time.Time `gorm:"column:backup_last_at"`
	BusinessType         int32      `gorm:"column:business_type;not null;default:0"`
	UpdatedAt            time.Time
}

type Warehouse struct {
	ID        uint32 `gorm:"primaryKey;autoIncrement"`
	Name      string `gorm:"not null;size:300"`
	Deleted   bool   `gorm:"not null;default:false"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Sku struct {
	ID          uint32 `gorm:"primaryKey;autoIncrement"`
	Code        string `gorm:"uniqueIndex;not null;size:255"`
	ProductID   uint32 `gorm:"column:product_id;not null"`
	BranchID    uint32 `gorm:"column:branch_id;not null"`
	WarehouseID uint32              `gorm:"column:warehouse_id;not null"`
	StockQty    int64               `gorm:"column:stock_qty;not null;default:0"`
	Deleted     bool                `gorm:"not null;default:false"`
	LastStockIn  *time.Time          `gorm:"column:last_stock_in"`
	LastStockOut *time.Time          `gorm:"column:last_stock_out"`
	CostingType  stockv1.CostingType `gorm:"column:costing_type;not null;default:0"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type StockTransaction struct {
	ID              uint64                  `gorm:"primaryKey;autoIncrement"`
	TransactionType stockv1.TransactionType `gorm:"column:transaction_type;not null"`
	Note            string                  `gorm:"size:500"`
	Cancelled       bool                    `gorm:"not null;default:false"`
	CreatedAt       time.Time
	Items           []StockTransactionItem `gorm:"foreignKey:TransactionID"`
	Total           float64
}

type StockTransactionItem struct {
	ID            uint64  `gorm:"primaryKey;autoIncrement"`
	TransactionID uint64  `gorm:"column:transaction_id;not null"`
	SkuID         uint32  `gorm:"column:sku_id;not null"`
	Quantity      int32   `gorm:"not null"`
	Price         float64 `gorm:"not null;default:0"`
	RackID        *uint32 `gorm:"column:rack_id"`
}

type Rack struct {
	ID          uint32 `gorm:"primaryKey;autoIncrement"`
	WarehouseID uint32 `gorm:"column:warehouse_id;not null"`
	Name        string `gorm:"not null;size:300"`
	Deleted     bool   `gorm:"not null;default:false"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Material struct {
	ID        uint32               `gorm:"primaryKey;autoIncrement"`
	BranchID  *uint32              `gorm:"column:branch_id"`
	Code      string               `gorm:"uniqueIndex;not null;size:100"`
	Name      string               `gorm:"not null;size:300"`
	QtyType   ingredientv1.QtyType `gorm:"column:qty_type;not null;default:0"`
	Qty       int32                `gorm:"not null;default:0"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Recipe struct {
	ID        uint32       `gorm:"primaryKey;autoIncrement"`
	ProductID uint32       `gorm:"column:product_id;not null"`
	Name      string       `gorm:"not null;size:300"`
	Items     []RecipeItem `gorm:"foreignKey:RecipeID"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type RecipeItem struct {
	ID         uint32 `gorm:"primaryKey;autoIncrement"`
	RecipeID   uint32 `gorm:"column:recipe_id;not null"`
	MaterialID uint32 `gorm:"column:material_id;not null"`
	Qty        int32  `gorm:"not null"`
	CreatedAt  time.Time
	Material   *Material `gorm:"foreignKey:MaterialID"`
}
