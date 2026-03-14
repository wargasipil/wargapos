package product_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) UpdateProduct(
	ctx context.Context,
	req *connect.Request[productv1.UpdateProductRequest],
) (*connect.Response[productv1.UpdateProductResponse], error) {
	if req.Msg.Id == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	updates := map[string]any{
		"name":        req.Msg.Name,
		"price_cents": req.Msg.PriceCents,
		"cogs_cents":  req.Msg.CogsCents,
		"is_active":   req.Msg.IsActive,
	}
	if req.Msg.ImageUrl != "" {
		updates["image_url"] = req.Msg.ImageUrl
	}
	if req.Msg.Description != "" {
		updates["description"] = req.Msg.Description
	}
	if req.Msg.Sku != "" {
		updates["sku"] = req.Msg.Sku
	}
	if req.Msg.CategoryId != 0 {
		updates["category_id"] = req.Msg.CategoryId
	}
	if err := s.db.WithContext(ctx).Model(&models.Product{}).Where("id = ?", req.Msg.Id).Updates(updates).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var p models.Product
	if err := s.db.WithContext(ctx).First(&p, "id = ?", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&productv1.UpdateProductResponse{Product: toProtoProduct(&p)}), nil
}
