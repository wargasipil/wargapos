package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

func (s *StockService) ListRackPlacement(
	ctx context.Context,
	req *connect.Request[stockv1.ListRackPlacementRequest],
) (*connect.Response[stockv1.ListRackPlacementResponse], error) {
	type row struct {
		SkuID     uint32
		SkuCode   string
		LeftStock int32
		Valuation float64
	}
	var rows []row
	if err := s.db.WithContext(ctx).Raw(`
		SELECT rp.sku_id,
		       s.code                                          AS sku_code,
		       rp.left_stock,
		       COALESCE(SUM(cv.unit_cost * cv.left_stock), 0) AS valuation
		FROM rack_placements rp
		JOIN skus s ON s.id = rp.sku_id
		LEFT JOIN cost_versions cv ON cv.sku_id = rp.sku_id AND cv.left_stock > 0
		WHERE rp.rack_id = ? AND rp.left_stock > 0
		GROUP BY rp.sku_id, s.code, rp.left_stock
		ORDER BY rp.left_stock DESC
	`, req.Msg.RackId).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	items := make([]*stockv1.RackPlacementItem, len(rows))
	for i, r := range rows {
		items[i] = &stockv1.RackPlacementItem{
			SkuId:     r.SkuID,
			SkuCode:   r.SkuCode,
			LeftStock: r.LeftStock,
			Valuation: r.Valuation,
		}
	}

	return connect.NewResponse(&stockv1.ListRackPlacementResponse{Items: items}), nil
}
