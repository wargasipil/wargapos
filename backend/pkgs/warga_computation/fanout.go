package warga_computation

// Concat emits all items from s1 then all items from s2.
func Concat[V any](s1, s2 Stream[V]) Stream[V] {
	return func(yield func(V) bool) {
		s1(func(v V) bool { return yield(v) })
		s2(func(v V) bool { return yield(v) })
	}
}

// Zip pairs items from two streams position-by-position.
// Stops when either stream is exhausted.
func Zip[A, B any](sa Stream[A], sb Stream[B]) Stream[Pair[A, B]] {
	return func(yield func(Pair[A, B]) bool) {
		as := Collect(sa)
		bs := Collect(sb)
		n := len(as)
		if len(bs) < n {
			n = len(bs)
		}
		for i := range n {
			if !yield(Pair[A, B]{First: as[i], Second: bs[i]}) {
				return
			}
		}
	}
}

// Tee calls side for each item as a side-effect, then re-emits the item unchanged.
func Tee[V any](s Stream[V], side func(V)) Stream[V] {
	return func(yield func(V) bool) {
		s(func(v V) bool {
			side(v)
			return yield(v)
		})
	}
}

// Split partitions a stream into two based on fn.
// Items where fn=true go to left; fn=false go to right.
// The source is consumed once; both halves are backed by collected slices.
func Split[V any](s Stream[V], fn func(V) bool) (left Stream[V], right Stream[V]) {
	var ls, rs []V
	s(func(v V) bool {
		if fn(v) {
			ls = append(ls, v)
		} else {
			rs = append(rs, v)
		}
		return true
	})
	return FromSlice(ls), FromSlice(rs)
}
