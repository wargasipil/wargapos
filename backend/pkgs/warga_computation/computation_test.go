package warga_computation_test

import (
	"testing"

	wc "wargapos/backend/pkgs/warga_computation"
)

func TestFromSliceAndCollect(t *testing.T) {
	got := wc.Collect(wc.FromSlice([]int{1, 2, 3}))
	if len(got) != 3 || got[0] != 1 || got[2] != 3 {
		t.Fatalf("unexpected %v", got)
	}
}

func TestFilter(t *testing.T) {
	got := wc.Collect(wc.Filter(wc.FromSlice([]int{1, 2, 3, 4}), func(v int) bool { return v%2 == 0 }))
	if len(got) != 2 || got[0] != 2 || got[1] != 4 {
		t.Fatalf("unexpected %v", got)
	}
}

func TestMap(t *testing.T) {
	got := wc.Collect(wc.Map(wc.FromSlice([]int{1, 2, 3}), func(v int) int { return v * 2 }))
	if got[0] != 2 || got[1] != 4 || got[2] != 6 {
		t.Fatalf("unexpected %v", got)
	}
}

func TestFlatMap(t *testing.T) {
	got := wc.Collect(wc.FlatMap(wc.FromSlice([]int{1, 2}), func(v int) wc.Stream[int] {
		return wc.FromSlice([]int{v, v * 10})
	}))
	if len(got) != 4 || got[0] != 1 || got[1] != 10 || got[2] != 2 || got[3] != 20 {
		t.Fatalf("unexpected %v", got)
	}
}

func TestTakeAndSkip(t *testing.T) {
	got := wc.Collect(wc.Take(wc.FromSlice([]int{1, 2, 3, 4, 5}), 3))
	if len(got) != 3 {
		t.Fatalf("Take: unexpected %v", got)
	}
	got2 := wc.Collect(wc.Skip(wc.FromSlice([]int{1, 2, 3, 4, 5}), 2))
	if len(got2) != 3 || got2[0] != 3 {
		t.Fatalf("Skip: unexpected %v", got2)
	}
}

func TestEarlyStop(t *testing.T) {
	calls := 0
	wc.FromSlice([]int{1, 2, 3, 4, 5})(func(v int) bool {
		calls++
		return calls < 2 // stop after 2
	})
	if calls != 2 {
		t.Fatalf("expected 2 calls, got %d", calls)
	}
}

func TestFold(t *testing.T) {
	sum := wc.Fold(wc.FromSlice([]int{1, 2, 3, 4}), 0, func(acc, v int) int { return acc + v })
	if sum != 10 {
		t.Fatalf("expected 10, got %d", sum)
	}
}

func TestSum(t *testing.T) {
	if wc.Sum(wc.FromSlice([]int64{10, 20, 30})) != 60 {
		t.Fatal("Sum failed")
	}
}

func TestCount(t *testing.T) {
	if wc.Count(wc.FromSlice([]int{1, 2, 3})) != 3 {
		t.Fatal("Count failed")
	}
}

func TestAvg(t *testing.T) {
	avg := wc.Avg(wc.FromSlice([]int{10, 20, 30}))
	if avg != 20.0 {
		t.Fatalf("expected 20.0, got %f", avg)
	}
	if wc.Avg(wc.Empty[int]()) != 0 {
		t.Fatal("Avg of empty should be 0")
	}
}

func TestGroupBy(t *testing.T) {
	counts := map[string]int{}
	wc.GroupBy(
		wc.FromSlice([]string{"a", "b", "a", "c", "b", "a"}),
		func(s string) string { return s },
		func(k string, group wc.Stream[string]) { counts[k] = wc.Count(group) },
	)
	if counts["a"] != 3 || counts["b"] != 2 || counts["c"] != 1 {
		t.Fatalf("GroupBy: unexpected %v", counts)
	}
}

func TestChunk(t *testing.T) {
	batches := wc.Collect(wc.Chunk(wc.FromSlice([]int{1, 2, 3, 4, 5}), 2))
	if len(batches) != 3 || len(batches[0]) != 2 || len(batches[2]) != 1 {
		t.Fatalf("Chunk: unexpected %v", batches)
	}
}

func TestTopN(t *testing.T) {
	top := wc.Collect(wc.TopN(wc.FromSlice([]int{3, 1, 4, 1, 5, 9, 2, 6}), 3, func(v int) int { return v }))
	if len(top) != 3 || top[0] != 9 || top[1] != 6 || top[2] != 5 {
		t.Fatalf("TopN: unexpected %v", top)
	}
}

func TestMinMax(t *testing.T) {
	mn, _ := wc.Min(wc.FromSlice([]int{3, 1, 4, 1, 5}), func(v int) int { return v })
	mx, _ := wc.Max(wc.FromSlice([]int{3, 1, 4, 1, 5}), func(v int) int { return v })
	if mn != 1 || mx != 5 {
		t.Fatalf("Min/Max: %d %d", mn, mx)
	}
	_, ok := wc.Min(wc.Empty[int](), func(v int) int { return v })
	if ok {
		t.Fatal("Min of empty should return false")
	}
}

func TestSortBy(t *testing.T) {
	got := wc.Collect(wc.SortBy(wc.FromSlice([]int{3, 1, 2}), func(v int) int { return v }, wc.Asc))
	if got[0] != 1 || got[1] != 2 || got[2] != 3 {
		t.Fatalf("SortBy Asc: %v", got)
	}
	got2 := wc.Collect(wc.SortBy(wc.FromSlice([]int{3, 1, 2}), func(v int) int { return v }, wc.Desc))
	if got2[0] != 3 || got2[1] != 2 || got2[2] != 1 {
		t.Fatalf("SortBy Desc: %v", got2)
	}
}

func TestConcat(t *testing.T) {
	got := wc.Collect(wc.Concat(wc.FromSlice([]int{1, 2}), wc.FromSlice([]int{3, 4})))
	if len(got) != 4 || got[2] != 3 {
		t.Fatalf("Concat: %v", got)
	}
}

func TestZip(t *testing.T) {
	got := wc.Collect(wc.Zip(wc.FromSlice([]int{1, 2, 3}), wc.FromSlice([]string{"a", "b"})))
	if len(got) != 2 || got[0].First != 1 || got[0].Second != "a" {
		t.Fatalf("Zip: %v", got)
	}
}

func TestTee(t *testing.T) {
	side := []int{}
	got := wc.Collect(wc.Tee(wc.FromSlice([]int{1, 2, 3}), func(v int) { side = append(side, v) }))
	if len(got) != 3 || len(side) != 3 {
		t.Fatalf("Tee: got=%v side=%v", got, side)
	}
}

func TestSplit(t *testing.T) {
	evens, odds := wc.Split(wc.FromSlice([]int{1, 2, 3, 4, 5}), func(v int) bool { return v%2 == 0 })
	if wc.Count(evens) != 2 || wc.Count(odds) != 3 {
		t.Fatal("Split: wrong counts")
	}
}

func TestDistinctBy(t *testing.T) {
	type item struct{ id, val int }
	got := wc.Collect(wc.DistinctBy(
		wc.FromSlice([]item{{1, 10}, {2, 20}, {1, 30}}),
		func(i item) int { return i.id },
	))
	if len(got) != 2 {
		t.Fatalf("DistinctBy: unexpected %v", got)
	}
}

func TestCache(t *testing.T) {
	calls := 0
	expensive := wc.FromFunc(func() (int, bool) {
		calls++
		if calls > 3 {
			return 0, false
		}
		return calls, true
	})
	cached := wc.Cache(expensive)
	a := wc.Collect(cached)
	b := wc.Collect(cached)
	// FromFunc makes one extra call to detect termination (3 values + 1 stop = 4 calls).
	// The key assertion is that the source was only consumed ONCE (not 8 calls for two Collects).
	if len(a) != 3 || len(b) != 3 || calls > 4 {
		t.Fatalf("Cache: a=%v b=%v calls=%d", a, b, calls)
	}
}

func TestHashJoin(t *testing.T) {
	type order struct{ id, productID int }
	type product struct{ id int; name string }
	type result struct{ orderID int; name string }

	orders := wc.FromSlice([]order{{1, 10}, {2, 20}, {3, 99}})
	products := wc.FromSlice([]product{{10, "Coffee"}, {20, "Tea"}})

	got := wc.Collect(wc.HashJoin(orders, products,
		func(o order) int { return o.productID },
		func(p product) int { return p.id },
		func(o order, p product) result { return result{o.id, p.name} },
	))
	if len(got) != 2 || got[0].name != "Coffee" || got[1].name != "Tea" {
		t.Fatalf("HashJoin: %v", got)
	}
}

func TestFirstLast(t *testing.T) {
	f, _ := wc.First(wc.FromSlice([]int{10, 20, 30}))
	l, _ := wc.Last(wc.FromSlice([]int{10, 20, 30}))
	if f != 10 || l != 30 {
		t.Fatalf("First=%d Last=%d", f, l)
	}
	_, ok := wc.First(wc.Empty[int]())
	if ok {
		t.Fatal("First of empty should return false")
	}
}

func TestAnyAll(t *testing.T) {
	s := wc.FromSlice([]int{1, 2, 3, 4})
	if !wc.Any(s, func(v int) bool { return v > 3 }) {
		t.Fatal("Any failed")
	}
	if wc.All(s, func(v int) bool { return v > 3 }) {
		t.Fatal("All failed")
	}
}

func TestPipe(t *testing.T) {
	onlyEven := wc.FilterFn(func(v int) bool { return v%2 == 0 })
	doubled := wc.MapFn(func(v int) int { return v * 2 })
	pipeline := wc.Pipe(onlyEven, doubled)

	got := wc.Collect(pipeline(wc.FromSlice([]int{1, 2, 3, 4, 5})))
	if len(got) != 2 || got[0] != 4 || got[1] != 8 {
		t.Fatalf("Pipe: %v", got)
	}
}
