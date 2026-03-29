package stock_service

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
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

	q := s.db.WithContext(ctx).Model(&stock_model.StockLog{}).Where("sku_id = ?", req.Msg.SkuId)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var rows []stock_model.StockLog
	if err := q.Order("id desc").Limit(pageSize).Offset(offset).Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	logs := make([]*stockv1.StockLog, len(rows))
	for i, r := range rows {
		logs[i] = &stockv1.StockLog{
			Id:            r.ID,
			SkuId:         r.SkuID,
			TransactionId: r.TransactionID,
			ActorId:       r.ActorID,
			LogType:       r.LogType,
			Change:        r.Change,
			CreatedAt:     timestamppb.New(r.CreatedAt),
		}
	}

	return connect.NewResponse(&stockv1.ListStockLogSkuResponse{
		Logs:  logs,
		Total: int32(total),
	}), nil
}
