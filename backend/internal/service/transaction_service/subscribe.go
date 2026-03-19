package transaction_service

import (
	"context"
	"sync"
	transactionv1 "wargapos/backend/gen/wargapos/transaction/v1"

	"connectrpc.com/connect"
	"github.com/google/uuid"
)

type pool struct {
	sync.Mutex
	eventChan chan *transactionv1.Event
	conn      map[string]*connect.ServerStream[transactionv1.SubscribeResponse]
}

var defautlPool = &pool{
	eventChan: make(chan *transactionv1.Event, 1000),
	conn:      make(map[string]*connect.ServerStream[transactionv1.SubscribeResponse]),
}

func pushEvent(event *transactionv1.Event) {
	select {
	case defautlPool.eventChan <- event:
	default: // drop silently if channel full
	}
}

// Subscribe implements [transactionv1connect.TransactionServiceHandler].
func (s *TransactionService) Subscribe(
	ctx context.Context,
	req *connect.Request[transactionv1.SubscribeRequest],
	stream *connect.ServerStream[transactionv1.SubscribeResponse]) error {

	var err error

	idstr := uuid.New().String()
	defautlPool.Lock()
	defautlPool.conn[idstr] = stream
	defautlPool.Unlock()

	defer func() { // for removing the connection from pool when stream is closed
		defautlPool.Lock()
		delete(defautlPool.conn, idstr)
		defautlPool.Unlock()

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

	for {
		select {
		case <-ctx.Done():

			return err
		case event := <-defautlPool.eventChan:
			for _, conn := range defautlPool.conn {
				err = conn.Send(&transactionv1.SubscribeResponse{
					Event: event,
				})
				if err != nil {
					return err
				}
			}

		}
	}
}
