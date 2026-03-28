package stock_service

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/service/stock_service/stock_model"
)

func (s *StockService) ListPriceSku(
	ctx context.Context,
	req *connect.Request[stockv1.ListPriceSkuRequest],
) (*connect.Response[stockv1.ListPriceSkuResponse], error) {
	var rows []stock_model.PriceVersion
	if err := s.db.WithContext(ctx).
		Where("sku_id = ?", req.Msg.SkuId).
		Order("id desc").
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	prices := make([]*stockv1.PriceVersion, len(rows))
	for i, r := range rows {
		prices[i] = &stockv1.PriceVersion{
			Id:            r.ID,
			SkuId:         r.SkuId,
			TransactionId: r.TransactionId,
			Price:         r.Price,
			StockInitiate: r.StockInitiate,
			LeftStock:     r.LeftStock,
			CreatedAt:     timestamppb.New(r.CreatedAt),
			UpdatedAt:     timestamppb.New(r.UpdatedAt),
		}
	}

	return connect.NewResponse(&stockv1.ListPriceSkuResponse{Prices: prices}), nil
}
