package warga_computation

// Stream[V] is a push-based lazy sequence.
// Calling a Stream invokes yield for each item in order.
// If yield returns false, the stream stops early (like break).
type Stream[V any] func(yield func(V) bool)

// Pair holds two values of potentially different types.
type Pair[A, B any] struct {
	First  A
	Second B
}

// Number is a type constraint for numeric operators (Sum, Avg).
type Number interface {
	~int | ~int32 | ~int64 | ~float32 | ~float64
}
