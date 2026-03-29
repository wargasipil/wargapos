package stock_service

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) ListCostSku(
	ctx context.Context,
	req *connect.Request[stockv1.ListCostSkuRequest],
) (*connect.Response[stockv1.ListCostSkuResponse], error) {
	var rows []stock_model.CostVersion
	if err := s.db.WithContext(ctx).
		Where("sku_id = ?", req.Msg.SkuId).
		Order("id desc").
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	costs := make([]*stockv1.CostVersion, len(rows))
	for i, r := range rows {
		costs[i] = &stockv1.CostVersion{
			Id:            r.ID,
			SkuId:         r.SkuId,
			TransactionId: r.TransactionId,
			UnitCost:      r.UnitCost,
			StockInitiate: r.StockInitiate,
			LeftStock:     r.LeftStock,
			CreatedAt:     timestamppb.New(r.CreatedAt),
			UpdatedAt:     timestamppb.New(r.UpdatedAt),
		}
	}

	return connect.NewResponse(&stockv1.ListCostSkuResponse{Costs: costs}), nil
}
