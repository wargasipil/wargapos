package stock_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

func (s *StockService) ListStockLogSku(
	ctx context.Context,
	req *connect.Request[stockv1.ListStockLogSkuRequest],
) (*connect.Response[stockv1.ListStockLogSkuResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 50
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.
		db.
		WithContext(ctx).
		Table("stock_logs sl").
		Joins("left join cost_versions cv on cv.id = sl.cost_version_id").
		Select([]string{
			"sl.*",
			"cv.unit_cost",
		}).
		Where("sl.sku_id = ?", req.Msg.SkuId)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var rows []struct {
		ID            uint64
		SkuID         uint32
		TransactionID uint64
		Change        int32
		LogType       stockv1.LogType
		ActorID       uint32
		CostVersionID uint64
		UnitCost      float64
		CreatedAt     time.Time
	}
	if err := q.Order("id desc").Limit(pageSize).Offset(offset).Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	logs := make([]*stockv1.ListStockLogItem, len(rows))
	for i, r := range rows {
		logs[i] = &stockv1.ListStockLogItem{
			Id:            r.ID,
			SkuId:         r.SkuID,
			TransactionId: r.TransactionID,
			ActorId:       r.ActorID,
			LogType:       r.LogType,
			Change:        r.Change,
			CostVersionId: r.CostVersionID,
			UnitCost:      r.UnitCost,
			CreatedAt:     timestamppb.New(r.CreatedAt),
		}
	}

	return connect.NewResponse(&stockv1.ListStockLogSkuResponse{
		Logs:  logs,
		Total: int32(total),
	}), nil
}
