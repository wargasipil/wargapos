package stock_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) GetSku(
	ctx context.Context,
	req *connect.Request[stockv1.GetSkuRequest],
) (*connect.Response[stockv1.GetSkuResponse], error) {
	q := s.db.WithContext(ctx).Where("deleted = false")

	switch id := req.Msg.Identifier.(type) {
	case *stockv1.GetSkuRequest_Id:
		q = q.Where("id = ?", id.Id)
	case *stockv1.GetSkuRequest_Code:
		q = q.Where("code = ?", id.Code)
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("identifier is required"))
	}

	var sku models.Sku
	if err := q.First(&sku).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return connect.NewResponse(&stockv1.GetSkuResponse{
				ErrCode: stockv1.SkuError_SKU_ERROR_NOTFOUND,
			}), nil
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoSku := toProtoSku(&sku)

	var ts struct {
		LastStockIn    *time.Time
		LastAdjustment *time.Time
		LastStockOut   *time.Time
	}
	s.db.WithContext(ctx).
		Model(&stock_model.StockLog{}).
		Select(
			`MAX(CASE WHEN log_type = ? THEN created_at END) AS last_stock_in,`+
				`MAX(CASE WHEN log_type = ? THEN created_at END) AS last_adjustment,`+
				`MAX(CASE WHEN log_type = ? THEN created_at END) AS last_stock_out`,
			stockv1.LogType_LOG_TYPE_STOCK_IN,
			stockv1.LogType_LOG_TYPE_ADJUSTMENT,
			stockv1.LogType_LOG_TYPE_STOCK_OUT,
		).
		Where("sku_id = ?", sku.ID).
		Scan(&ts)

	if ts.LastStockIn != nil {
		protoSku.LastStockIn = timestamppb.New(*ts.LastStockIn)
	}
	if ts.LastAdjustment != nil {
		protoSku.LastAdjustment = timestamppb.New(*ts.LastAdjustment)
	}
	if ts.LastStockOut != nil {
		protoSku.LastStockOut = timestamppb.New(*ts.LastStockOut)
	}

	var valuation struct{ StockValuation float64 }
	s.db.WithContext(ctx).Raw(
		`SELECT COALESCE(SUM(unit_cost * left_stock), 0) AS stock_valuation FROM cost_versions WHERE sku_id = ? AND left_stock > 0`,
		sku.ID,
	).Scan(&valuation)
	protoSku.StockValuation = valuation.StockValuation

	return connect.NewResponse(&stockv1.GetSkuResponse{Sku: protoSku}), nil
}
