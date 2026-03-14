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
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Order struct {
	ID            int64       `gorm:"primaryKey;autoIncrement"`
	SessionToken  *string     `gorm:"column:session_token;uniqueIndex"`
	CashierID     *int64      `gorm:"type:bigint"`
	TotalCents    int64       `gorm:"not null;default:0"`
	Status        string      `gorm:"not null;default:pending;size:20"`
	PaymentMethod *string     `gorm:"size:50"`
	TableID       *int64      `gorm:"column:table_id;type:bigint"`
	SnapToken     *string     `gorm:"column:snap_token"`
	CustomerName  *string     `gorm:"column:customer_name"`
	PhoneNumber   *string     `gorm:"column:phone_number"`
	OrderFrom     int32       `gorm:"column:order_from;not null;default:0"`
	Items         []OrderItem `gorm:"foreignKey:OrderID"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Table struct {
	ID        int64  `gorm:"primaryKey;autoIncrement"`
	Name      string `gorm:"not null"`
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
