package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) ListRack(
	ctx context.Context,
	req *connect.Request[stockv1.ListRackRequest],
) (*connect.Response[stockv1.ListRackResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&stock_model.Rack{}).Where("deleted = false")
	if f := req.Msg.Filter; f != nil {
		if f.WarehouseId > 0 {
			q = q.Where("warehouse_id = ?", f.WarehouseId)
		}
		if f.Search != "" {
			q = q.Where("name ILIKE ?", "%"+f.Search+"%")
		}
		if f.SkuId > 0 {
			q = q.Where("id IN (SELECT rack_id FROM rack_placements WHERE sku_id = ? AND left_stock > 0)", f.SkuId)
		}
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var racks []stock_model.Rack
	if err := q.Order("id asc").Limit(pageSize).Offset(offset).Find(&racks).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// collect rack IDs for stats query
	rackIDs := make([]uint32, len(racks))
	for i, r := range racks {
		rackIDs[i] = r.ID
	}

	type rackStats struct {
		RackID         uint32
		StockCount     int32
		SkuCount       int32
		StockValuation float64
	}
	statsMap := make(map[uint32]rackStats)
	if len(rackIDs) > 0 {
		var stats []rackStats
		s.db.WithContext(ctx).Raw(`
			SELECT rp.rack_id,
			       COALESCE(SUM(rp.left_stock), 0)               AS stock_count,
			       COUNT(DISTINCT rp.sku_id)                     AS sku_count,
			       COALESCE(SUM(cv.unit_cost * cv.left_stock), 0) AS stock_valuation
			FROM rack_placements rp
			LEFT JOIN cost_versions cv ON cv.sku_id = rp.sku_id AND cv.left_stock > 0
			WHERE rp.rack_id IN ?
			GROUP BY rp.rack_id
		`, rackIDs).Scan(&stats)
		for _, st := range stats {
			statsMap[st.RackID] = st
		}
	}

	proto := make([]*stockv1.Rack, len(racks))
	for i := range racks {
		p := toProtoRack(&racks[i])
		if st, ok := statsMap[racks[i].ID]; ok {
			p.StockCount     = st.StockCount
			p.SkuCount       = st.SkuCount
			p.StockValuation = st.StockValuation
		}
		proto[i] = p
	}

	return connect.NewResponse(&stockv1.ListRackResponse{
		Racks: proto,
		Total: int32(total),
	}), nil
}
