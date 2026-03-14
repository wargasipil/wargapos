package product_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5/pgconn"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) CreateProduct(
	ctx context.Context,
	req *connect.Request[productv1.CreateProductRequest],
) (*connect.Response[productv1.CreateProductResponse], error) {
	if req.Msg.Name == "" || req.Msg.Sku == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name and sku are required"))
	}

	p := &models.Product{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
		PriceCents:  req.Msg.PriceCents,
		CogsCents:   req.Msg.CogsCents,
		SKU:         req.Msg.Sku,
		IsActive:    true,
	}
	if req.Msg.CategoryId != 0 {
		catID := req.Msg.CategoryId
		p.CategoryID = &catID
	}
	if req.Msg.ImageUrl != "" {
		url := req.Msg.ImageUrl
		p.ImageURL = &url
	}

	if err := s.db.WithContext(ctx).Create(p).Error; err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.Code {
			case "23505":
				return nil, connect.NewError(connect.CodeAlreadyExists, errors.New(pgErr.Detail))
			case "23503":
				return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("referenced category does not exist"))
			}
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&productv1.CreateProductResponse{Product: toProtoProduct(p)}), nil
}
