package table_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	tablev1 "wargapos/backend/gen/wargapos/table/v1"
	"wargapos/backend/internal/models"
)

func (s *TableService) CreateTable(
	ctx context.Context,
	req *connect.Request[tablev1.CreateTableRequest],
) (*connect.Response[tablev1.CreateTableResponse], error) {
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name is required"))
	}

	table := models.Table{Name: req.Msg.Name}
	if err := s.db.WithContext(ctx).Create(&table).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&tablev1.CreateTableResponse{Table: toProtoTable(&table)}), nil
}
