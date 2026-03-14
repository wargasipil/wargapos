package transaction_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"

	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"
	"wargapos/backend/internal/models"
)

func (s *TransactionService) CreatePaymentToken(
	ctx context.Context,
	req *connect.Request[transactionv1.CreatePaymentTokenRequest],
) (*connect.Response[transactionv1.CreatePaymentTokenResponse], error) {
	if req.Msg.OrderId == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("order_id is required"))
	}

	order, err := s.loadOrder(ctx, req.Msg.OrderId)
	if err != nil || order.Status != "pending" {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("pending order not found"))
	}
	if len(order.Items) == 0 {
		return nil, connect.NewError(connect.CodeFailedPrecondition, ErrCartEmpty)
	}

	env := midtrans.Sandbox
	if s.midtransCfg.Environment == "production" {
		env = midtrans.Production
	}

	var snapClient snap.Client
	snapClient.New(s.midtransCfg.ServerKey, env)

	snapReq := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  midtransOrderID(order.ID),
			GrossAmt: order.TotalCents,
		},
		CustomerDetail: &midtrans.CustomerDetails{FName: "Guest"},
	}

	snapResp, snapErr := snapClient.CreateTransaction(snapReq)
	if snapErr != nil {
		return nil, connect.NewError(connect.CodeInternal, errors.New(snapErr.GetMessage()))
	}

	// Persist snap token on the order for reference.
	s.db.Model(&models.Order{}).Where("id = ?", order.ID).Update("snap_token", snapResp.Token)

	return connect.NewResponse(&transactionv1.CreatePaymentTokenResponse{
		SnapToken: snapResp.Token,
		ClientKey: s.midtransCfg.ClientKey,
	}), nil
}
