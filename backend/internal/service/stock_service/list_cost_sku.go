package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

func (s *StockService) ListCostSku(
	ctx context.Context,
	req *connect.Request[stockv1.ListCostSkuRequest],
) (*connect.Response[stockv1.ListCostSkuResponse], error) {
	type groupedCost struct {
		UnitCost      float64
		StockInitiate int32
		LeftStock     int32
		Total         float64
		BatchCount    int32
	}

	q := `
		SELECT unit_cost,
		       SUM(stock_initiate) AS stock_initiate,
		       SUM(left_stock)     AS left_stock,
		       SUM(unit_cost * left_stock) AS total,
		       COUNT(*)            AS batch_count
		FROM cost_versions
		WHERE sku_id = ?`
	if req.Msg.OnlyActive {
		q += ` AND left_stock > 0`
	}
	q += ` GROUP BY unit_cost ORDER BY total DESC`

	var rows []groupedCost
	if err := s.db.WithContext(ctx).Raw(q, req.Msg.SkuId).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	costs := make([]*stockv1.ListCostSkuItem, len(rows))
	for i, r := range rows {
		costs[i] = &stockv1.ListCostSkuItem{
			UnitCost:      r.UnitCost,
			StockInitiate: r.StockInitiate,
			LeftStock:     r.LeftStock,
			Total:         r.Total,
			BatchCount:    r.BatchCount,
		}
	}

	return connect.NewResponse(&stockv1.ListCostSkuResponse{Costs: costs}), nil
}
