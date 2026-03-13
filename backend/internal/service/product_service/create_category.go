package product_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5/pgconn"

	productv1 "wargapos/backend/gen/wargapos/product/v1"
	"wargapos/backend/internal/models"
)

func (s *ProductService) CreateCategory(
	ctx context.Context,
	req *connect.Request[productv1.CreateCategoryRequest],
) (*connect.Response[productv1.CreateCategoryResponse], error) {
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name is required"))
	}

	cat := &models.Category{Name: req.Msg.Name}
	if err := s.db.WithContext(ctx).Create(cat).Error; err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, connect.NewError(connect.CodeAlreadyExists, errors.New(pgErr.Detail))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&productv1.CreateCategoryResponse{Category: toProtoCategory(cat)}), nil
}
