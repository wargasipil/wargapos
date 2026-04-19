package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) GetRack(
	ctx context.Context,
	req *connect.Request[stockv1.GetRackRequest],
) (*connect.Response[stockv1.GetRackResponse], error) {
	var rack stock_model.Rack
	var err error

	switch by := req.Msg.By.(type) {
	case *stockv1.GetRackRequest_Id:
		err = s.db.WithContext(ctx).First(&rack, "id = ? AND deleted = false", by.Id).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return connect.NewResponse(&stockv1.GetRackResponse{}), nil
			}
			return nil, connect.NewError(connect.CodeInternal, err)
		}

	case *stockv1.GetRackRequest_Name:
		err = s.db.WithContext(ctx).
			First(&rack, "warehouse_id = ? AND name = ? AND deleted = false", by.Name.WarehouseId, by.Name.Name).
			Error
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, connect.NewError(connect.CodeInternal, err)
			}
			if !req.Msg.CreateIfNotFound {
				return nil, connect.NewError(connect.CodeNotFound, errors.New("rack not found"))
			}
			rack = stock_model.Rack{
				WarehouseID: by.Name.WarehouseId,
				Name:        by.Name.Name,
			}
			if createErr := s.db.WithContext(ctx).Create(&rack).Error; createErr != nil {
				return nil, connect.NewError(connect.CodeInternal, createErr)
			}
		}

	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("rack identifier is required"))
	}

	p := toProtoRack(&rack)

	type rackStats struct {
		StockCount     int32
		SkuCount       int32
		StockValuation float64
	}
	var st rackStats
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(rp.left_stock), 0)               AS stock_count,
		       COUNT(DISTINCT rp.sku_id)                     AS sku_count,
		       COALESCE(SUM(cv.unit_cost * cv.left_stock), 0) AS stock_valuation
		FROM rack_placements rp
		LEFT JOIN cost_versions cv ON cv.sku_id = rp.sku_id AND cv.left_stock > 0
		WHERE rp.rack_id = ?
	`, rack.ID).Scan(&st)

	p.StockCount = st.StockCount
	p.SkuCount = st.SkuCount
	p.StockValuation = st.StockValuation

	return connect.NewResponse(&stockv1.GetRackResponse{Rack: p}), nil
}
