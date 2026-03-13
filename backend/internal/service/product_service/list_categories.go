package product_service

import (
	"context"

	"connectrpc.com/connect"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) ListCategories(
	ctx context.Context,
	req *connect.Request[productv1.ListCategoriesRequest],
) (*connect.Response[productv1.ListCategoriesResponse], error) {
	var cats []models.Category
	if err := s.db.WithContext(ctx).Order("name").Find(&cats).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*productv1.Category, len(cats))
	for i := range cats {
		proto[i] = toProtoCategory(&cats[i])
	}
	return connect.NewResponse(&productv1.ListCategoriesResponse{Categories: proto}), nil
}
