package warga_computation

// FromSlice emits each element of the slice in order.
func FromSlice[V any](values []V) Stream[V] {
	return func(yield func(V) bool) {
		for _, v := range values {
			if !yield(v) {
				return
			}
		}
	}
}

// FromMap emits each key-value pair (iteration order not guaranteed).
func FromMap[K comparable, V any](m map[K]V) Stream[Pair[K, V]] {
	return func(yield func(Pair[K, V]) bool) {
		for k, v := range m {
			if !yield(Pair[K, V]{First: k, Second: v}) {
				return
			}
		}
	}
}

// FromFunc calls fn repeatedly until fn returns (zero, false) or yield returns false.
func FromFunc[V any](fn func() (V, bool)) Stream[V] {
	return func(yield func(V) bool) {
		for {
			v, ok := fn()
			if !ok {
				return
			}
			if !yield(v) {
				return
			}
		}
	}
}

// Single emits exactly one value.
func Single[V any](v V) Stream[V] {
	return func(yield func(V) bool) {
		yield(v)
	}
}

// Empty emits nothing.
func Empty[V any]() Stream[V] {
	return func(_ func(V) bool) {}
}
