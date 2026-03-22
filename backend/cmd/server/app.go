package main

import (
	"context"

	"github.com/urfave/cli/v3"

	"wargapos/backend/internal/service/transaction_service"
	"wargapos/backend/pkgs/runner"
)

// App holds the configured HTTP mux.
type App *cli.Command

// NewApp is a Wire provider that wires all service handlers into the HTTP mux.
func NewApp(
	webrunner WebRunnerFunc,
	transactionRunner transaction_service.Runner,
	partitionRunner PartitionRunnerFunc,
) App {

	command := &cli.Command{
		Name: "server",
		Action: func(ctx context.Context, c *cli.Command) error {

			rctx := runner.NewRunnerContext(ctx)
			rctx.Run(runner.RunnerFunc(transactionRunner))
			rctx.Run(runner.RunnerFunc(webrunner))

			<-rctx.Done()

			err := rctx.Err()
			if err != nil {
				return err
			}

			return nil
		},
		Commands: []*cli.Command{
			{
				Name:   "partition",
				Action: cli.ActionFunc(partitionRunner),
			},
		},
	}

	return command
}
