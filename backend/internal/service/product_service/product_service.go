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
	var categoryID int64
	if p.CategoryID != nil {
		categoryID = *p.CategoryID
	}
	imageURL := ""
	if p.ImageURL != nil {
		imageURL = *p.ImageURL
	}
	return &productv1.Product{
		Id:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		CategoryId:  categoryID,
		PriceCents:  p.PriceCents,
		CogsCents:   p.CogsCents,
		IsActive:    p.IsActive,
		Sku:         p.SKU,
		ImageUrl:    imageURL,
		StockQty:    p.StockQty,
	}
}

func toProtoCategory(c *models.Category) *productv1.Category {
	return &productv1.Category{
		Id:   c.ID,
		Name: c.Name,
	}
}
