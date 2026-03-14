package table_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	tablev1 "wargapos/backend/gen/wargapos/table/v1"
	"wargapos/backend/internal/models"
)

func (s *TableService) UpdateTable(
	ctx context.Context,
	req *connect.Request[tablev1.UpdateTableRequest],
) (*connect.Response[tablev1.UpdateTableResponse], error) {
	if req.Msg.Id == 0 || req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id and name are required"))
	}

	var table models.Table
	if err := s.db.WithContext(ctx).First(&table, "id = ?", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("table not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&table).Update("name", req.Msg.Name).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&tablev1.UpdateTableResponse{Table: toProtoTable(&table)}), nil
}
