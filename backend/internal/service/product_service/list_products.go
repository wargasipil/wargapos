package product_service

import (
	"context"

	"connectrpc.com/connect"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) ListProducts(
	ctx context.Context,
	req *connect.Request[productv1.ListProductsRequest],
) (*connect.Response[productv1.ListProductsResponse], error) {
	page := req.Msg.Page
	pageSize := req.Msg.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	db := s.db.WithContext(ctx).Model(&models.Product{})
	if req.Msg.ActiveOnly {
		db = db.Where("is_active = true")
	}
	if req.Msg.CategoryId != 0 {
		db = db.Where("category_id = ?", req.Msg.CategoryId)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var products []models.Product
	if err := db.Offset(int((page-1)*pageSize)).Limit(int(pageSize)).Find(&products).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*productv1.Product, len(products))
	for i := range products {
		proto[i] = toProtoProduct(&products[i])
	}
	return connect.NewResponse(&productv1.ListProductsResponse{
		Products: proto,
		Total:    int32(total),
	}), nil
}
