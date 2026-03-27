package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) DeleteWarehouse(
	ctx context.Context,
	req *connect.Request[stockv1.DeleteWarehouseRequest],
) (*connect.Response[stockv1.DeleteWarehouseResponse], error) {
	if req.Msg.Id == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id is required"))
	}

	result := s.db.WithContext(ctx).Model(&models.Warehouse{}).
		Where("id = ? AND deleted = false", req.Msg.Id).
		Update("deleted", true)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("warehouse not found"))
	}

	return connect.NewResponse(&stockv1.DeleteWarehouseResponse{}), nil
}
