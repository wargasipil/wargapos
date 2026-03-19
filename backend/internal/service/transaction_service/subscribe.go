package transaction_service

import (
	"context"
	"log/slog"
	"sync"
	"time"
	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"

	"connectrpc.com/connect"
	"github.com/google/uuid"
)

type pool struct {
	sync.Mutex
	eventChan chan *transactionv1.Event
	conn      map[string]*connect.ServerStream[transactionv1.SubscribeResponse]
}

var defaultPool = &pool{
	Mutex:     sync.Mutex{},
	eventChan: make(chan *transactionv1.Event, 1000),
	conn:      make(map[string]*connect.ServerStream[transactionv1.SubscribeResponse]),
}

// Subscribe implements [transactionv1connect.TransactionServiceHandler].
func (s *TransactionService) Subscribe(
	ctx context.Context,
	req *connect.Request[transactionv1.SubscribeRequest],
	stream *connect.ServerStream[transactionv1.SubscribeResponse]) error {

	var err error

	idstr := uuid.New().String()
	slog.Info("new subscription", "stream_id", idstr)

	defaultPool.Lock()
	defaultPool.conn[idstr] = stream
	defaultPool.Unlock()

	defer func() { // for removing the connection from pool when stream is closed
		defaultPool.Lock()
		defer defaultPool.Unlock()
		delete(defaultPool.conn, idstr)
		slog.Info("removing subscription", "stream_id", idstr)

	}()

	err = stream.Send(&transactionv1.SubscribeResponse{
		Event: &transactionv1.Event{
			Event: &transactionv1.Event_Connected{
				Connected: &transactionv1.ConnectedEvent{
					StreamId: idstr,
				},
			},
		},
	})

	if err != nil {
		return err
	}

	tick := time.NewTicker(time.Second * 10)
	defer tick.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-tick.C:
			err = stream.Send(&transactionv1.SubscribeResponse{
				Event: &transactionv1.Event{
					Event: &transactionv1.Event_Ping{},
				},
			})
			if err != nil {
				return err
			}
		}
	}

}
