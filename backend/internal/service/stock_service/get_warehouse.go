package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) GetWarehouse(
	ctx context.Context,
	req *connect.Request[stockv1.GetWarehouseRequest],
) (*connect.Response[stockv1.GetWarehouseResponse], error) {
	var warehouses []models.Warehouse
	if err := s.db.WithContext(ctx).
		Where("id IN ? AND deleted = false", req.Msg.Ids).
		Find(&warehouses).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	result := make(map[uint32]*stockv1.Warehouse, len(warehouses))
	for i := range warehouses {
		result[warehouses[i].ID] = toProtoWarehouse(&warehouses[i])
	}

	type warehouseStat struct {
		WarehouseID         uint32
		TotalLeftStock      int32
		TotalStockValuation float64
		TotalSkuCount       int32
	}
	var stats []warehouseStat
	s.db.WithContext(ctx).Raw(`
		SELECT s.warehouse_id,
		       COALESCE(SUM(s.stock_qty), 0)                    AS total_left_stock,
		       COALESCE(SUM(cv.unit_cost * cv.left_stock), 0)   AS total_stock_valuation,
		       COUNT(DISTINCT s.id)                             AS total_sku_count
		FROM skus s
		LEFT JOIN cost_versions cv ON cv.sku_id = s.id AND cv.left_stock > 0
		WHERE s.warehouse_id IN ? AND s.deleted = false
		GROUP BY s.warehouse_id
	`, req.Msg.Ids).Scan(&stats)

	for _, st := range stats {
		if w, ok := result[st.WarehouseID]; ok {
			w.TotalLeftStock      = st.TotalLeftStock
			w.TotalStockValuation = st.TotalStockValuation
			w.TotalSkuCount       = st.TotalSkuCount
		}
	}

	return connect.NewResponse(&stockv1.GetWarehouseResponse{Warehouses: result}), nil
}
