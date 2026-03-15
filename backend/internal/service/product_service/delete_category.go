package product_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) DeleteCategory(
	ctx context.Context,
	req *connect.Request[productv1.DeleteCategoryRequest],
) (*connect.Response[productv1.DeleteCategoryResponse], error) {
	if req.Msg.Id == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	result := s.db.WithContext(ctx).Delete(&models.Category{}, "id = ?", req.Msg.Id)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, gorm.ErrRecordNotFound)
	}
	return connect.NewResponse(&productv1.DeleteCategoryResponse{}), nil
}
