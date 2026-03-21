package models

import "time"

type User struct {
	ID           int64   `gorm:"primaryKey;autoIncrement"`
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
	ID        int64  `gorm:"primaryKey;autoIncrement"`
	ProductID int64  `gorm:"column:product_id;not null"`
	Delta     int32  `gorm:"column:delta;not null"`
	Reason    string `gorm:"column:reason;not null"`
	Note      string `gorm:"column:note;not null;default:''"`
	CreatedBy *int64 `gorm:"column:created_by"`
	CreatedAt time.Time
}

type Order struct {
	ID            int64       `gorm:"primaryKey;autoIncrement"`
	SessionToken  *string     `gorm:"column:session_token;uniqueIndex"`
	CashierID     *int64      `gorm:"type:bigint"`
	TotalCents    int64       `gorm:"not null;default:0"`
	Status        int32       `gorm:"not null;default:1"`
	PaymentMethod *int32      `gorm:"column:payment_method"`
	TableID       *int64      `gorm:"column:table_id;type:bigint"`
	SnapToken     *string     `gorm:"column:snap_token"`
	CustomerName  *string     `gorm:"column:customer_name"`
	PhoneNumber   *string     `gorm:"column:phone_number"`
	OrderFrom     int32       `gorm:"column:order_from;not null;default:0"`
	PaymentStatus    int32       `gorm:"column:payment_status;not null;default:1"`
	CashTenderedCents *int64     `gorm:"column:cash_tendered_cents"`
	ChangeCents       *int64     `gorm:"column:change_cents"`
	Items         []OrderItem `gorm:"foreignKey:OrderID"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
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
	ID                  int    `gorm:"primaryKey;autoIncrement"`
	MidtransServerKey   string `gorm:"column:midtrans_server_key;not null;default:''"`
	MidtransClientKey   string `gorm:"column:midtrans_client_key;not null;default:''"`
	MidtransEnvironment string `gorm:"column:midtrans_environment;not null;default:'sandbox'"`
	BankName            string `gorm:"column:bank_name;not null;default:''"`
	BankAccountNumber   string `gorm:"column:bank_account_number;not null;default:''"`
	BankAccountName     string `gorm:"column:bank_account_name;not null;default:''"`
	QrisImageUrl        string `gorm:"column:qris_image_url;not null;default:''"`
	PrinterTitle        string `gorm:"column:printer_title;not null;default:''"`
	PrinterDescription  string `gorm:"column:printer_description;not null;default:''"`
	PrinterAddress      string `gorm:"column:printer_address;not null;default:''"`
	PrinterAddress2     string `gorm:"column:printer_address2;not null;default:''"`
	PrinterContact      string `gorm:"column:printer_contact;not null;default:''"`
	PrinterFooter       string `gorm:"column:printer_footer;not null;default:''"`
	UpdatedAt           time.Time
}
