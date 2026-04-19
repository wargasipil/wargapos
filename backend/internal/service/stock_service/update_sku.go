package stock_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) UpdateSku(
	ctx context.Context,
	req *connect.Request[stockv1.UpdateSkuRequest],
) (*connect.Response[stockv1.UpdateSkuResponse], error) {
	var sku stock_model.Sku
	if err := s.db.WithContext(ctx).First(&sku, "id = ? AND deleted = false", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("sku not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&sku).Updates(map[string]any{
		"code":       req.Msg.Code,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.UpdateSkuResponse{Sku: toProtoSku(&sku)}), nil
}
