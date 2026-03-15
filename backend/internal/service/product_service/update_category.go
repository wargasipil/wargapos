package product_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) UpdateCategory(
	ctx context.Context,
	req *connect.Request[productv1.UpdateCategoryRequest],
) (*connect.Response[productv1.UpdateCategoryResponse], error) {
	if req.Msg.Id == 0 || req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id and name are required"))
	}

	result := s.db.WithContext(ctx).Model(&models.Category{}).Where("id = ?", req.Msg.Id).Update("name", req.Msg.Name)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, gorm.ErrRecordNotFound)
	}

	var cat models.Category
	if err := s.db.WithContext(ctx).First(&cat, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&productv1.UpdateCategoryResponse{
		Category: &productv1.Category{Id: cat.ID, Name: cat.Name},
	}), nil
}
