package product_service

import (
	"gorm.io/gorm"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
	"wargapos/backend/internal/models"
)

// ProductService implements productv1connect.ProductServiceHandler directly.
type ProductService struct {
	db *gorm.DB
}

// NewProductService is the Wire provider constructor.
func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{db: db}
}

var _ productv1connect.ProductServiceHandler = (*ProductService)(nil)

func toProtoProduct(p *models.Product) *productv1.Product {
	categoryID := ""
	if p.CategoryID != nil {
		categoryID = *p.CategoryID
	}
	return &productv1.Product{
		Id:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		CategoryId:  categoryID,
		PriceCents:  p.PriceCents,
		IsActive:    p.IsActive,
		Sku:         p.SKU,
	}
}

func toProtoCategory(c *models.Category) *productv1.Category {
	return &productv1.Category{
		Id:   c.ID,
		Name: c.Name,
	}
}
