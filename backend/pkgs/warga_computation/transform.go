package warga_computation

// Map transforms each item using fn.
func Map[In, Out any](s Stream[In], fn func(In) Out) Stream[Out] {
	return func(yield func(Out) bool) {
		s(func(v In) bool {
			return yield(fn(v))
		})
	}
}

// Filter passes only items where fn returns true.
func Filter[V any](s Stream[V], fn func(V) bool) Stream[V] {
	return func(yield func(V) bool) {
		s(func(v V) bool {
			if fn(v) {
				return yield(v)
			}
			return true
		})
	}
}

// FlatMap expands each item into a sub-stream, emitting all sub-items inline.
func FlatMap[In, Out any](s Stream[In], fn func(In) Stream[Out]) Stream[Out] {
	return func(yield func(Out) bool) {
		s(func(v In) bool {
			cont := true
			fn(v)(func(out Out) bool {
				cont = yield(out)
				return cont
			})
			return cont
		})
	}
}

// Take stops after emitting n items.
func Take[V any](s Stream[V], n int) Stream[V] {
	return func(yield func(V) bool) {
		count := 0
		s(func(v V) bool {
			if count >= n {
				return false
			}
			count++
			return yield(v)
		})
	}
}

// Skip discards the first n items, then emits the rest.
func Skip[V any](s Stream[V], n int) Stream[V] {
	return func(yield func(V) bool) {
		skipped := 0
		s(func(v V) bool {
			if skipped < n {
				skipped++
				return true
			}
			return yield(v)
		})
	}
}

// Distinct skips consecutive duplicate values. Requires comparable V.
func Distinct[V comparable](s Stream[V]) Stream[V] {
	return func(yield func(V) bool) {
		var zero V
		prev := zero
		first := true
		s(func(v V) bool {
			if first || v != prev {
				first = false
				prev = v
				return yield(v)
			}
			return true
		})
	}
}

// DistinctBy skips items whose key was already seen anywhere in the stream.
func DistinctBy[V any, K comparable](s Stream[V], key func(V) K) Stream[V] {
	return func(yield func(V) bool) {
		seen := make(map[K]struct{})
		s(func(v V) bool {
			k := key(v)
			if _, exists := seen[k]; exists {
				return true
			}
			seen[k] = struct{}{}
			return yield(v)
		})
	}
}

// Cache collects the stream into a slice and returns a replayable Stream.
// Use when the same source must be consumed more than once.
func Cache[V any](s Stream[V]) Stream[V] {
	buf := Collect(s)
	return FromSlice(buf)
}
