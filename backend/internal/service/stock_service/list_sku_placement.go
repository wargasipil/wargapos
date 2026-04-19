package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) ListSkuPlacement(
	ctx context.Context,
	req *connect.Request[stockv1.ListSkuPlacementRequest],
) (*connect.Response[stockv1.ListSkuPlacementResponse], error) {
	var placements []stock_model.RackPlacement
	if err := s.db.WithContext(ctx).
		Where("sku_id = ?", req.Msg.SkuId).
		Find(&placements).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Collect rack IDs and load racks in one query
	rackIDs := make([]uint32, 0, len(placements))
	for _, p := range placements {
		rackIDs = append(rackIDs, p.RackID)
	}

	rackMap := make(map[uint32]*stock_model.Rack, len(rackIDs))
	if len(rackIDs) > 0 {
		var racks []stock_model.Rack
		if err := s.db.WithContext(ctx).Where("id IN ?", rackIDs).Find(&racks).Error; err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		for i := range racks {
			rackMap[racks[i].ID] = &racks[i]
		}
	}

	result := make([]*stockv1.RackPlacement, len(placements))
	for i, p := range placements {
		var protoRack *stockv1.Rack
		if r, ok := rackMap[p.RackID]; ok {
			protoRack = toProtoRack(r)
		}
		result[i] = &stockv1.RackPlacement{
			Id:        p.ID,
			SkuId:     p.SkuID,
			Rack:      protoRack,
			LeftStock: p.LeftStock,
		}
	}

	return connect.NewResponse(&stockv1.ListSkuPlacementResponse{Placements: result}), nil
}
