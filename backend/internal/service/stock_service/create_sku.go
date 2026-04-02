package stock_service

import (
	"context"
	"errors"
	"strings"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) CreateSku(
	ctx context.Context,
	req *connect.Request[stockv1.CreateSkuRequest],
) (*connect.Response[stockv1.CreateSkuResponse], error) {
	sku := models.Sku{
		Code:        req.Msg.Code,
		ProductID:   req.Msg.ProductId,
		BranchID:    req.Msg.BranchId,
		WarehouseID: req.Msg.WarehouseId,
		ProductType: int32(req.Msg.ProductType),
	}
	if err := s.db.WithContext(ctx).Create(&sku).Error; err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, connect.NewError(connect.CodeAlreadyExists, errors.New("sku code already exists"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.CreateSkuResponse{Sku: toProtoSku(&sku)}), nil
}
