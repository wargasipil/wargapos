package runner

import (
	"time"
)

type GraphFunc[T any] func(rctx *RunnerContext, before T) (T, error)

func BuildNode() GraphFunc[int] {
	return func(rctx *RunnerContext, before int) (int, error) {
		return before + 1, nil
	}
}

type State interface {
	Deadline() time.Duration
	PutNextDeadline()
}

type Node struct {
	label   string
	id      uint64
	handler func(rctx *RunnerContext) error
}

type Graph struct {
	sequences []Node // map[label]func
	states    []State
	seqMap    map[uint64]Node
}

func (g *Graph) Run(rctx *RunnerContext) error {
	var err error
	var tempDeadline, deadline DurationList
	index := 0
	loc := 0

	for {
		select {
		case <-rctx.Done():
			return nil
		default:
			if index >= len(g.sequences) {
				index = 0
				loc = 0
			}

			if index != 0 {
				deadline = g.getDeadline()
				tempDeadline = deadline[:index]
				_, loc = tempDeadline.Min()
			}

			err = g.sequences[loc].handler(rctx)
			if err != nil {
				return err
			}

			g.states[loc].PutNextDeadline()
			index++

		}

	}
}

func (g *Graph) AddNode(label string, handler func(rctx *RunnerContext) error, state State) {
	g.sequences = append(g.sequences, Node{label: label, handler: handler})
	g.states = append(g.states, state)
}

type DurationList []time.Duration

func (d DurationList) Min() (time.Duration, int) {
	if len(d) == 0 {
		return 0, -1
	}
	min := d[0]
	minIndex := 0
	for i, duration := range d {
		if duration < min {
			min = duration
			minIndex = i
		}
	}
	return min, minIndex
}

func (g *Graph) getDeadline() DurationList {
	deadlines := make([]time.Duration, len(g.sequences))
	for i, node := range g.sequences {
		deadlines[i] = g.states[node.id].Deadline()
	}

	return deadlines
}
