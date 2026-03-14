package product_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

// DeleteProduct soft-deletes by setting is_active=false to preserve order history.
func (s *ProductService) DeleteProduct(
	ctx context.Context,
	req *connect.Request[productv1.DeleteProductRequest],
) (*connect.Response[productv1.DeleteProductResponse], error) {
	if req.Msg.Id == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	result := s.db.WithContext(ctx).Model(&models.Product{}).Where("id = ?", req.Msg.Id).Update("is_active", false)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, gorm.ErrRecordNotFound)
	}
	return connect.NewResponse(&productv1.DeleteProductResponse{}), nil
}
