package handler

import (
	"context"

	"connectrpc.com/connect"
	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
)

type TransactionHandler struct{}

var _ transactionv1connect.TransactionServiceHandler = (*TransactionHandler)(nil)

func (h *TransactionHandler) AddToCart(
	ctx context.Context,
	req *connect.Request[transactionv1.AddToCartRequest],
) (*connect.Response[transactionv1.AddToCartResponse], error) {
	return connect.NewResponse(&transactionv1.AddToCartResponse{
		Cart: &transactionv1.Order{
			Id:     "stub-cart-" + req.Msg.SessionId,
			Status: transactionv1.OrderStatus_ORDER_STATUS_PENDING,
		},
	}), nil
}

func (h *TransactionHandler) RemoveFromCart(
	ctx context.Context,
	req *connect.Request[transactionv1.RemoveFromCartRequest],
) (*connect.Response[transactionv1.RemoveFromCartResponse], error) {
	return connect.NewResponse(&transactionv1.RemoveFromCartResponse{
		Cart: &transactionv1.Order{
			Id:     "stub-cart-" + req.Msg.SessionId,
			Status: transactionv1.OrderStatus_ORDER_STATUS_PENDING,
		},
	}), nil
}

func (h *TransactionHandler) GetCart(
	ctx context.Context,
	req *connect.Request[transactionv1.GetCartRequest],
) (*connect.Response[transactionv1.GetCartResponse], error) {
	return connect.NewResponse(&transactionv1.GetCartResponse{
		Cart: &transactionv1.Order{
			Id:     "stub-cart-" + req.Msg.SessionId,
			Status: transactionv1.OrderStatus_ORDER_STATUS_PENDING,
		},
	}), nil
}

func (h *TransactionHandler) Checkout(
	ctx context.Context,
	req *connect.Request[transactionv1.CheckoutRequest],
) (*connect.Response[transactionv1.CheckoutResponse], error) {
	return connect.NewResponse(&transactionv1.CheckoutResponse{
		Order: &transactionv1.Order{
			Id:        "stub-order-id",
			CashierId: req.Msg.CashierId,
			Status:    transactionv1.OrderStatus_ORDER_STATUS_PAID,
		},
	}), nil
}

func (h *TransactionHandler) GetOrder(
	ctx context.Context,
	req *connect.Request[transactionv1.GetOrderRequest],
) (*connect.Response[transactionv1.GetOrderResponse], error) {
	return connect.NewResponse(&transactionv1.GetOrderResponse{
		Order: &transactionv1.Order{
			Id:     req.Msg.OrderId,
			Status: transactionv1.OrderStatus_ORDER_STATUS_PAID,
		},
	}), nil
}

func (h *TransactionHandler) ListOrders(
	ctx context.Context,
	req *connect.Request[transactionv1.ListOrdersRequest],
) (*connect.Response[transactionv1.ListOrdersResponse], error) {
	return connect.NewResponse(&transactionv1.ListOrdersResponse{
		Orders: []*transactionv1.Order{},
		Total:  0,
	}), nil
}
