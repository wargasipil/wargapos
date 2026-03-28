package wargatest

import (
	"net/http/httptest"
	"testing"
)

type InititateFunc func(t *testing.T) func()

type Scenario struct {
	t    *testing.T
	init []InititateFunc
}

func NewScenario(t *testing.T, init ...InititateFunc) *Scenario {
	return &Scenario{
		t:    t,
		init: init,
	}
}

func (s *Scenario) Run(testfunc func(t *testing.T)) {
	defered := make([]func(), len(s.init))
	for i, init := range s.init {
		tearDown := init(s.t)
		if tearDown == nil {
			tearDown = func() {}
		}
		defered[i] = tearDown
	}

	for _, f := range defered {
		defer f()
	}

	testfunc(s.t)
}

func NewConnectServer(server *httptest.Server) InititateFunc {
	return func(t *testing.T) func() {
		return func() {
			server.Close()
		}
	}
}
