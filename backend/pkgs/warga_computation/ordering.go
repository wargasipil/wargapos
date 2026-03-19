package warga_computation

import (
	"cmp"
	"container/heap"
	"slices"
)

// Direction controls sort order.
type Direction bool

const (
	Asc  Direction = true
	Desc Direction = false
)

// SortBy collects all items and returns them sorted by key.
func SortBy[V any, K cmp.Ordered](s Stream[V], key func(V) K, dir Direction) Stream[V] {
	items := Collect(s)
	slices.SortFunc(items, func(a, b V) int {
		ka, kb := key(a), key(b)
		if dir == Asc {
			return cmp.Compare(ka, kb)
		}
		return cmp.Compare(kb, ka)
	})
	return FromSlice(items)
}

// TopN returns the N items with the highest key value using a min-heap (O(n log k)).
func TopN[V any, K cmp.Ordered](s Stream[V], n int, key func(V) K) Stream[V] {
	if n <= 0 {
		return Empty[V]()
	}
	h := &minHeap[V, K]{key: key}
	s(func(v V) bool {
		heap.Push(h, v)
		if h.Len() > n {
			heap.Pop(h)
		}
		return true
	})
	// Extract from heap (ascending); reverse for descending order
	result := make([]V, h.Len())
	for i := len(result) - 1; i >= 0; i-- {
		result[i] = heap.Pop(h).(V)
	}
	return FromSlice(result)
}

// Min returns the item with the smallest key value.
func Min[V any, K cmp.Ordered](s Stream[V], key func(V) K) (V, bool) {
	var minVal V
	var minKey K
	found := false
	s(func(v V) bool {
		k := key(v)
		if !found || k < minKey {
			minVal = v
			minKey = k
			found = true
		}
		return true
	})
	return minVal, found
}

// Max returns the item with the largest key value.
func Max[V any, K cmp.Ordered](s Stream[V], key func(V) K) (V, bool) {
	var maxVal V
	var maxKey K
	found := false
	s(func(v V) bool {
		k := key(v)
		if !found || k > maxKey {
			maxVal = v
			maxKey = k
			found = true
		}
		return true
	})
	return maxVal, found
}

// ── min-heap internals ────────────────────────────────────────────────────────

type minHeap[V any, K cmp.Ordered] struct {
	items []V
	key   func(V) K
}

func (h *minHeap[V, K]) Len() int { return len(h.items) }
func (h *minHeap[V, K]) Less(i, j int) bool {
	return h.key(h.items[i]) < h.key(h.items[j])
}
func (h *minHeap[V, K]) Swap(i, j int) { h.items[i], h.items[j] = h.items[j], h.items[i] }
func (h *minHeap[V, K]) Push(x any)    { h.items = append(h.items, x.(V)) }
func (h *minHeap[V, K]) Pop() any {
	old := h.items
	n := len(old)
	v := old[n-1]
	h.items = old[:n-1]
	return v
}
