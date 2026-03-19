package warga_computation

// ForEach calls fn for every item. Blocks until the stream is exhausted.
func ForEach[V any](s Stream[V], fn func(V)) {
	s(func(v V) bool { fn(v); return true })
}

// Collect drains the stream into a slice.
func Collect[V any](s Stream[V]) []V {
	var result []V
	s(func(v V) bool { result = append(result, v); return true })
	return result
}

// First returns the first item emitted, or (zero, false) if the stream is empty.
func First[V any](s Stream[V]) (V, bool) {
	var out V
	found := false
	s(func(v V) bool {
		out = v
		found = true
		return false // stop after first
	})
	return out, found
}

// Last returns the final item emitted, or (zero, false) if the stream is empty.
func Last[V any](s Stream[V]) (V, bool) {
	var out V
	found := false
	s(func(v V) bool {
		out = v
		found = true
		return true
	})
	return out, found
}

// Any returns true if fn returns true for at least one item.
func Any[V any](s Stream[V], fn func(V) bool) bool {
	found := false
	s(func(v V) bool {
		if fn(v) {
			found = true
			return false
		}
		return true
	})
	return found
}

// All returns true if fn returns true for every item (vacuously true for empty streams).
func All[V any](s Stream[V], fn func(V) bool) bool {
	all := true
	s(func(v V) bool {
		if !fn(v) {
			all = false
			return false
		}
		return true
	})
	return all
}
