package transaction_service

import (
	"context"
	"fmt"
	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"

	"connectrpc.com/connect"
)

// Push implements [transactionv1connect.TransactionServiceHandler].
func (s *TransactionService) Push(
	ctx context.Context,
	req *connect.Request[transactionv1.PushRequest],
) (*connect.Response[transactionv1.PushResponse], error) {
	event := req.Msg.Event

	select {
	case <-ctx.Done():
		return nil, fmt.Errorf("channel is full")
	case defautlPool.eventChan <- event:
		return connect.NewResponse(&transactionv1.PushResponse{}), nil
	}

}
