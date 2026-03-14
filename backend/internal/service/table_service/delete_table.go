package table_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	tablev1 "wargapos/backend/gen/wargapos/table/v1"
	"wargapos/backend/internal/models"
)

func (s *TableService) DeleteTable(
	ctx context.Context,
	req *connect.Request[tablev1.DeleteTableRequest],
) (*connect.Response[tablev1.DeleteTableResponse], error) {
	if req.Msg.Id == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	result := s.db.WithContext(ctx).Delete(&models.Table{}, "id = ?", req.Msg.Id)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("table not found"))
	}

	return connect.NewResponse(&tablev1.DeleteTableResponse{}), nil
}
