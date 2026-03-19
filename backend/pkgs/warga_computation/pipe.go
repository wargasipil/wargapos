package warga_computation

// Transform is a reusable pipeline stage that converts Stream[In] to Stream[Out].
type Transform[In, Out any] func(Stream[In]) Stream[Out]

// Pipe composes two transforms into one: A→B then B→C becomes A→C.
func Pipe[A, B, C any](f Transform[A, B], g Transform[B, C]) Transform[A, C] {
	return func(s Stream[A]) Stream[C] {
		return g(f(s))
	}
}

// FilterFn wraps Filter as a reusable Transform.
func FilterFn[V any](fn func(V) bool) Transform[V, V] {
	return func(s Stream[V]) Stream[V] {
		return Filter(s, fn)
	}
}

// MapFn wraps Map as a reusable Transform.
func MapFn[In, Out any](fn func(In) Out) Transform[In, Out] {
	return func(s Stream[In]) Stream[Out] {
		return Map(s, fn)
	}
}
