package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) DeleteRack(
	ctx context.Context,
	req *connect.Request[stockv1.DeleteRackRequest],
) (*connect.Response[stockv1.DeleteRackResponse], error) {
	result := s.db.WithContext(ctx).Model(&models.Rack{}).
		Where("id = ? AND deleted = false", req.Msg.Id).
		Update("deleted", true)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("rack not found"))
	}

	return connect.NewResponse(&stockv1.DeleteRackResponse{}), nil
}
