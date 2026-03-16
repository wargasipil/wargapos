package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"time"
	connectorv1 "wargapos/backend/gen/wargapos/connector/v1"
	devicev1 "wargapos/backend/gen/wargapos/device/v1"
	"wargapos/backend/gen/wargapos/device/v1/devicev1connect"

	"connectrpc.com/connect"
)

func (a *App) StartStream(serverURL, id, name string) error {
	client := devicev1connect.NewDeviceServiceClient(
		&http.Client{},
		serverURL,
	)

	backoff := time.Second
	for {
		if err := a.connectOnce(client, id, name); err != nil {
			log.Printf("connector: device connect lost (%v), retrying in %s", err, backoff)
		}
		time.Sleep(backoff)
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}
func (a *App) connectOnce(client devicev1connect.DeviceServiceClient, id, name string) error {
	var err error
	ctx := context.Background()

	// getting printer names
	res, err := a.connectorSvc.ListPrinters(ctx, &connect.Request[connectorv1.ListPrintersRequest]{})
	if err != nil {
		return err
	}

	stream, err := client.Connect(ctx, connect.NewRequest(&devicev1.ConnectRequest{
		Id:           id,
		Name:         name,
		PrinterNames: res.Msg.Names,
	}))
	if err != nil {
		return err
	}
	defer stream.Close()

	for stream.Receive() {
		// first message confirms registration; further messages are not expected
		msg := stream.Msg()
		switch scmd := msg.GetResult().(type) {
		case *devicev1.ConnectResponse_Device:
			log.Printf("connector: registered device %s (%s)", scmd.Device.Name, scmd.Device.Id)
		case *devicev1.ConnectResponse_PrintRequest:
			slog.Info("connector: received print request")
			ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
			req := connectorv1.PrintRequest{
				PrinterName: scmd.PrintRequest.Printer.Name,
			}
			switch pdata := scmd.PrintRequest.Data.(type) {
			case *devicev1.PrintRequest_Text:
				req.Data = &connectorv1.PrintRequest_StringData{
					StringData: pdata.Text,
				}
			case *devicev1.PrintRequest_Raw:
				req.Data = &connectorv1.PrintRequest_BytesData{
					BytesData: pdata.Raw,
				}
			}
			_, err = a.connectorSvc.Print(ctx, connect.NewRequest(&req))
			cancel()
			if err != nil {
				log.Printf("connector: failed to send print request: %v", err)
			}
		default:
			log.Printf("connector: unexpected message from server: %T", msg.GetResult())
		}
	}
	return stream.Err()
}
