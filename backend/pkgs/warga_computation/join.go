package warga_computation

// HashJoin performs an inner join between two streams on a shared key.
// The right stream is fully collected into a lookup map first.
// For each left item with a matching right item, merge is called and the result is emitted.
func HashJoin[L, R any, K comparable, Out any](
	left     Stream[L],
	right    Stream[R],
	leftKey  func(L) K,
	rightKey func(R) K,
	merge    func(L, R) Out,
) Stream[Out] {
	lookup := make(map[K]R)
	right(func(r R) bool {
		lookup[rightKey(r)] = r
		return true
	})
	return func(yield func(Out) bool) {
		left(func(l L) bool {
			if r, ok := lookup[leftKey(l)]; ok {
				return yield(merge(l, r))
			}
			return true
		})
	}
}

// LeftHashJoin is like HashJoin but also emits left items that have no matching right item.
// The right pointer passed to merge is nil when no match exists.
func LeftHashJoin[L, R any, K comparable, Out any](
	left     Stream[L],
	right    Stream[R],
	leftKey  func(L) K,
	rightKey func(R) K,
	merge    func(L, *R) Out,
) Stream[Out] {
	lookup := make(map[K]R)
	right(func(r R) bool {
		lookup[rightKey(r)] = r
		return true
	})
	return func(yield func(Out) bool) {
		left(func(l L) bool {
			if r, ok := lookup[leftKey(l)]; ok {
				return yield(merge(l, &r))
			}
			return yield(merge(l, nil))
		})
	}
}
