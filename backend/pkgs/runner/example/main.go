package main

import (
	"context"
	"log/slog"
	"math/rand"
	"sync"
	"time"
	"wargapos/backend/pkgs/runner"
)

type SequenceState struct {
	runner.DeadlineState
	sync.Mutex

	label string
	data  []int
}

// Process implements [runner.State].
func (s *SequenceState) Process(rctx *runner.RunnerContext) error {
	s.Lock()
	defer s.Unlock()

	slog.Info("process sequence state", "label", s.label, "data", s.data)
	time.Sleep(time.Second)
	s.data = []int{}
	return nil
}

func (s *SequenceState) Next() bool {
	if s.Deadline() > s.TDeadline {
		return true
	}
	return len(s.data) > 10
}

func (s *SequenceState) Randomize(wctx *runner.RunnerContext) error {

	for {
		select {
		case <-wctx.Done():
			return nil
		default:
			sec := rand.Intn(10)
			time.Sleep(time.Second * time.Duration(sec))
			s.Lock()
			s.data = append(s.data, rand.Intn(100))
			s.Unlock()
		}
	}
}

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug)
	slog.Info("example runner")

	seqState := &SequenceState{
		label: "state 1",
		DeadlineState: runner.DeadlineState{
			TDeadline: time.Second * 5,
		},
		data: []int{1, 2, 3, 4, 5},
	}

	state2 := &SequenceState{
		label: "state 2",
		DeadlineState: runner.DeadlineState{
			TDeadline: time.Second * 10,
		},
		data: []int{},
	}

	state3 := &SequenceState{
		label: "state 3",
		DeadlineState: runner.DeadlineState{
			TDeadline: time.Second * 7,
		},
		data: []int{},
	}

	rctx := runner.NewRunnerContext(context.Background())
	rctx.Run(seqState.Randomize)
	rctx.Run(state2.Randomize)
	rctx.Run(state3.Randomize)

	rctx.Run(func(wctx *runner.RunnerContext) error {
		return runner.RunScheduleState(rctx,
			seqState,
			state2,
			state3,
		)
	})

	<-rctx.Done()
	slog.Info("runner stopped")
	if err := rctx.Err(); err != nil {
		panic(err)
	}
}
