package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) ListStockMovements(
	ctx context.Context,
	req *connect.Request[stockv1.ListStockMovementsRequest],
) (*connect.Response[stockv1.ListStockMovementsResponse], error) {
	if req.Msg.ProductId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("product_id is required"))
	}

	page := req.Msg.Page
	pageSize := req.Msg.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	type movementRow struct {
		models.StockMovement
		CreatedByName string
	}

	base := s.db.WithContext(ctx).Table("stock_movements").
		Where("stock_movements.product_id = ?", req.Msg.ProductId)

	if req.Msg.DateFrom != "" {
		base = base.Where("stock_movements.created_at >= ?", req.Msg.DateFrom)
	}
	if req.Msg.DateTo != "" {
		base = base.Where("stock_movements.created_at < ?", req.Msg.DateTo+"T23:59:59Z")
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var rows []movementRow
	if err := base.
		Select("stock_movements.*, COALESCE(users.username, '') AS created_by_name").
		Joins("LEFT JOIN users ON users.id = stock_movements.created_by").
		Order("stock_movements.created_at DESC").
		Offset(int((page-1)*pageSize)).
		Limit(int(pageSize)).
		Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*stockv1.StockMovement, len(rows))
	for i, row := range rows {
		m := row.StockMovement
		var createdBy int64
		if m.CreatedBy != nil {
			createdBy = int64(*m.CreatedBy)
		}
		proto[i] = &stockv1.StockMovement{
			Id:            int64(m.ID),
			ProductId:     int64(m.ProductID),
			Delta:         m.Delta,
			Reason:        m.Reason,
			Note:          m.Note,
			CreatedBy:     createdBy,
			CreatedAt:     m.CreatedAt.Format("2006-01-02 15:04:05"),
			CreatedByName: row.CreatedByName,
		}
	}

	return connect.NewResponse(&stockv1.ListStockMovementsResponse{
		Movements: proto,
		Total:     int32(total),
	}), nil
}
