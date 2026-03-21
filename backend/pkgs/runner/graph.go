package runner

import (
	"log/slog"
	"time"
)

type State interface {
	Deadline() time.Duration
	PutNextDeadline()
	Next() bool
	TearDown() error
	Process(rctx *RunnerContext) error
}

type DeadlineState struct {
	TDeadline    time.Duration
	nextDeadline time.Time
}

func (d *DeadlineState) Deadline() time.Duration {
	if d.nextDeadline.IsZero() {
		d.nextDeadline = time.Now().Add(d.TDeadline)
		return d.TDeadline
	}

	return time.Since(d.nextDeadline)
}

func (d *DeadlineState) PutNextDeadline() {
	d.nextDeadline = time.Now().Add(d.TDeadline)
}

func (d *DeadlineState) TearDown() error {
	return nil
}

func RunScheduleState(rctx *RunnerContext, states ...State) error {
	var err error
	var state State

	for {
		select {
		case <-rctx.Done():
			return nil
		default:
			var tempDeadline DurationList
			for _, state := range states {
				tempDeadline = append(tempDeadline, state.Deadline())
			}

			_, index := tempDeadline.Late()
			slog.Debug("getting deadline", "index", index, "deadline", tempDeadline)

			state = states[index]

			if state.Next() {
				err = state.Process(rctx)
				if err != nil {
					return err
				}
				state.PutNextDeadline()
			}
		}

		time.Sleep(time.Millisecond * 200)
	}
}

type DurationList []time.Duration

func (d DurationList) Late() (time.Duration, int) {
	if len(d) == 0 {
		return 0, -1
	}
	min := d[0]
	minIndex := 0
	for i, duration := range d {
		if duration > min {
			min = duration
			minIndex = i
		}
	}
	return min, minIndex
}
