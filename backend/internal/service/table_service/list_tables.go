package table_service

import (
	"context"

	"connectrpc.com/connect"

	tablev1 "wargapos/backend/gen/wargapos/table/v1"
	"wargapos/backend/internal/models"
)

func (s *TableService) ListTables(
	ctx context.Context,
	req *connect.Request[tablev1.ListTablesRequest],
) (*connect.Response[tablev1.ListTablesResponse], error) {
	var tables []models.Table
	if err := s.db.WithContext(ctx).Order("name asc").Find(&tables).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*tablev1.Table, len(tables))
	for i := range tables {
		proto[i] = toProtoTable(&tables[i])
	}

	return connect.NewResponse(&tablev1.ListTablesResponse{Tables: proto}), nil
}
