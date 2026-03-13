package handler

import (
	"context"

	"connectrpc.com/connect"
	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
)

type ProductHandler struct{}

var _ productv1connect.ProductServiceHandler = (*ProductHandler)(nil)

func (h *ProductHandler) CreateProduct(
	ctx context.Context,
	req *connect.Request[productv1.CreateProductRequest],
) (*connect.Response[productv1.CreateProductResponse], error) {
	return connect.NewResponse(&productv1.CreateProductResponse{
		Product: &productv1.Product{Id: "stub-id", Name: req.Msg.Name},
	}), nil
}

func (h *ProductHandler) GetProduct(
	ctx context.Context,
	req *connect.Request[productv1.GetProductRequest],
) (*connect.Response[productv1.GetProductResponse], error) {
	return connect.NewResponse(&productv1.GetProductResponse{
		Product: &productv1.Product{Id: req.Msg.Id, Name: "stub-product"},
	}), nil
}

func (h *ProductHandler) ListProducts(
	ctx context.Context,
	req *connect.Request[productv1.ListProductsRequest],
) (*connect.Response[productv1.ListProductsResponse], error) {
	return connect.NewResponse(&productv1.ListProductsResponse{
		Products: []*productv1.Product{},
		Total:    0,
	}), nil
}

func (h *ProductHandler) UpdateProduct(
	ctx context.Context,
	req *connect.Request[productv1.UpdateProductRequest],
) (*connect.Response[productv1.UpdateProductResponse], error) {
	return connect.NewResponse(&productv1.UpdateProductResponse{
		Product: &productv1.Product{Id: req.Msg.Id},
	}), nil
}

func (h *ProductHandler) DeleteProduct(
	ctx context.Context,
	req *connect.Request[productv1.DeleteProductRequest],
) (*connect.Response[productv1.DeleteProductResponse], error) {
	return connect.NewResponse(&productv1.DeleteProductResponse{}), nil
}

func (h *ProductHandler) CreateCategory(
	ctx context.Context,
	req *connect.Request[productv1.CreateCategoryRequest],
) (*connect.Response[productv1.CreateCategoryResponse], error) {
	return connect.NewResponse(&productv1.CreateCategoryResponse{
		Category: &productv1.Category{Id: "stub-id", Name: req.Msg.Name},
	}), nil
}

func (h *ProductHandler) ListCategories(
	ctx context.Context,
	req *connect.Request[productv1.ListCategoriesRequest],
) (*connect.Response[productv1.ListCategoriesResponse], error) {
	return connect.NewResponse(&productv1.ListCategoriesResponse{
		Categories: []*productv1.Category{},
	}), nil
}
