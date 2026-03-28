package stock_service

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) ListStockSku(
	ctx context.Context,
	req *connect.Request[stockv1.ListStockSkuRequest],
) (*connect.Response[stockv1.ListStockSkuResponse], error) {
	var rows []stock_model.Stock
	if err := s.db.WithContext(ctx).
		Where("sku_id = ?", req.Msg.SkuId).
		Order("id desc").
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	stocks := make([]*stockv1.Stock, len(rows))
	for i, r := range rows {
		stocks[i] = &stockv1.Stock{
			Id:            r.ID,
			SkuId:         r.SkuID,
			TransactionId: r.TransactionID,
			StockInitiate: r.StockInitiate,
			LeftStock:     r.LeftStock,
			CreatedAt:     timestamppb.New(r.CreatedAt),
			UpdatedAt:     timestamppb.New(r.UpdatedAt),
		}
	}

	return connect.NewResponse(&stockv1.ListStockSkuResponse{Stocks: stocks}), nil
}
