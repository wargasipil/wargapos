package warga_computation

// Fold accumulates all items into a single result using fn.
func Fold[V, A any](s Stream[V], init A, fn func(A, V) A) A {
	acc := init
	s(func(v V) bool {
		acc = fn(acc, v)
		return true
	})
	return acc
}

// Count returns the number of items in the stream.
func Count[V any](s Stream[V]) int {
	n := 0
	s(func(_ V) bool { n++; return true })
	return n
}

// Sum returns the total of all items.
func Sum[V Number](s Stream[V]) V {
	var total V
	s(func(v V) bool { total += v; return true })
	return total
}

// GroupBy groups items by key, calling fn once per unique key with that key's sub-stream.
// The sub-stream is backed by a collected slice — items are fully buffered per group.
func GroupBy[V any, K comparable](s Stream[V], key func(V) K, fn func(K, Stream[V])) {
	groups := make(map[K][]V)
	order := make([]K, 0)
	s(func(v V) bool {
		k := key(v)
		if _, exists := groups[k]; !exists {
			order = append(order, k)
		}
		groups[k] = append(groups[k], v)
		return true
	})
	for _, k := range order {
		fn(k, FromSlice(groups[k]))
	}
}

// Chunk batches items into slices of size n. The last batch may be smaller.
func Chunk[V any](s Stream[V], n int) Stream[[]V] {
	return func(yield func([]V) bool) {
		batch := make([]V, 0, n)
		s(func(v V) bool {
			batch = append(batch, v)
			if len(batch) == n {
				if !yield(append([]V(nil), batch...)) {
					return false
				}
				batch = batch[:0]
			}
			return true
		})
		if len(batch) > 0 {
			yield(batch)
		}
	}
}
