package models

import "time"

type User struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Username     string    `gorm:"uniqueIndex;not null;size:100"`
	FullName     string    `gorm:"not null;size:255"`
	Email        string    `gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string    `gorm:"not null;size:255"`
	Role         string    `gorm:"not null;default:cashier;size:20"`
	IsActive     bool      `gorm:"not null;default:true"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Category struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string    `gorm:"uniqueIndex;not null;size:255"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Product struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string    `gorm:"not null;size:255"`
	Description string    `gorm:"type:text"`
	CategoryID  *string   `gorm:"type:uuid"`
	PriceCents  int64     `gorm:"not null;default:0"`
	IsActive    bool      `gorm:"not null;default:true"`
	SKU         string    `gorm:"uniqueIndex;not null;size:100;column:sku"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Order struct {
	ID            string      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	CashierID     *string     `gorm:"type:uuid"`
	TotalCents    int64       `gorm:"not null;default:0"`
	Status        string      `gorm:"not null;default:pending;size:20"`
	PaymentMethod *string     `gorm:"size:50"`
	Items         []OrderItem `gorm:"foreignKey:OrderID"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type OrderItem struct {
	ID             string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	OrderID        string  `gorm:"type:uuid;not null"`
	ProductID      *string `gorm:"type:uuid"`
	ProductName    string  `gorm:"not null;size:255"`
	Quantity       int32   `gorm:"not null"`
	UnitPriceCents int64   `gorm:"not null"`
	SubtotalCents  int64   `gorm:"not null"`
	CreatedAt      time.Time
}
