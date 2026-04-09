package marketplace_order_service

import (
	"context"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) ListCustomers(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.ListCustomersRequest],
) (*connect.Response[marketplaceorderv1.ListCustomersResponse], error) {
	page := int(req.Msg.Page)
	if page < 1 {
		page = 1
	}
	pageSize := int(req.Msg.PageSize)
	if pageSize < 1 || pageSize > 200 {
		pageSize = 20
	}

	q := s.db.WithContext(ctx).Model(&models.MarketplaceCustomer{})
	if req.Msg.Search != "" {
		q = q.Where("name ILIKE ?", "%"+req.Msg.Search+"%")
	}

	var total int64
	q.Count(&total)

	var customers []models.MarketplaceCustomer
	if err := q.Order("name asc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&customers).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*marketplacev1.MarketplaceCustomer, len(customers))
	for i, c := range customers {
		proto[i] = toCustomerProto(c)
	}

	return connect.NewResponse(&marketplaceorderv1.ListCustomersResponse{
		Customers: proto,
		Total:     int32(total),
	}), nil
}
