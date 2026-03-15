package table_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	tablev1 "wargapos/backend/gen/wargapos/table/v1"
	"wargapos/backend/internal/models"
)

func (s *TableService) GetTable(
	ctx context.Context,
	req *connect.Request[tablev1.GetTableRequest],
) (*connect.Response[tablev1.GetTableResponse], error) {
	var t models.Table
	db := s.db.WithContext(ctx)
	if req.Msg.Uuid != "" {
		db = db.Where("uuid = ?", req.Msg.Uuid)
	} else {
		db = db.Where("id = ?", req.Msg.Id)
	}
	if err := db.First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, gorm.ErrRecordNotFound)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&tablev1.GetTableResponse{Table: toProtoTable(&t)}), nil
}
