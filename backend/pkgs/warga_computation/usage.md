# warga_computation

Functional stream processing library using Go 1.22+ iterators. Provides composable, lazily-evaluated pipelines for transforming, aggregating, and analyzing data.

## Core concept

A `Stream[V]` is a `func(yield func(V) bool)` — it pushes items to `yield` one at a time. Transforms are lazy (no work done until a **sink** is called). Returning `false` from `yield` stops iteration early.

## Quick example

```go
products := FromSlice(allProducts)

top5 := Collect(
    TopN(
        Filter(products, func(p Product) bool { return p.IsActive }),
        5,
        func(p Product) int64 { return p.PriceCents },
    ),
)
```

---

## Sources — create a stream

```go
FromSlice([]T{1, 2, 3})          // stream from slice
FromMap(map[K]V{...})             // stream of Pair[K,V] (unordered)
FromFunc(func() (T, bool))        // call fn repeatedly until (_, false)
Single(value)                     // stream of exactly one item
Empty[T]()                        // empty stream
```

## Transforms — lazy, item-by-item

```go
Map(s, func(v In) Out)            // transform each item
Filter(s, func(v T) bool)         // keep items where predicate is true
FlatMap(s, func(v In) Stream[Out])// expand each item into a sub-stream
Take(s, n)                        // emit first n items, then stop
Skip(s, n)                        // discard first n items
Distinct(s)                       // skip consecutive duplicates
DistinctBy(s, keyFn)              // skip globally duplicated keys (uses map)
Cache(s)                          // collect into slice, return replayable stream
```

## Sinks — blocking, execute the pipeline

```go
Collect(s)              // []T — drain all items into a slice
ForEach(s, fn)          // call fn for every item (side-effects)
First(s)                // (T, bool) — first item, short-circuits
Last(s)                 // (T, bool) — last item
Any(s, fn)              // bool — true if any item matches, short-circuits
All(s, fn)              // bool — true if all items match, short-circuits
```

## Aggregates

```go
Fold(s, init, func(acc A, v T) A) A   // general-purpose reducer
Count(s)                               // number of items
Sum(s)                                 // numeric total (int/float)
Avg(s)                                 // float64 mean (0 if empty)

GroupBy(s, keyFn, func(key K, group Stream[V]))  // callback once per group (blocking)
Chunk(s, n)                                       // Stream[[]T] — batches of n
```

## Ordering

```go
SortBy(s, keyFn, Asc)    // sort ascending  (blocking)
SortBy(s, keyFn, Desc)   // sort descending (blocking)
TopN(s, n, keyFn)        // n highest items via min-heap, O(n log k)
Min(s, keyFn)            // (T, bool) — item with smallest key
Max(s, keyFn)            // (T, bool) — item with largest key
```

## Fanout — combine, split, observe

```go
Concat(s1, s2)           // s1 items, then s2 items
Zip(sa, sb)              // Stream[Pair[A,B]] — stops at shorter stream (blocking)
Tee(s, sideFn)           // call sideFn per item, re-emit unchanged (logging/debug)
Split(s, predFn)         // (left, right Stream[T]) — partition by predicate (blocking)
```

## Join — key-based joining

```go
// Inner join — only emits when both sides have matching key
HashJoin(left, right, leftKey, rightKey, merge)

// Left join — emits all left items; right pointer is nil if no match
LeftHashJoin(left, right, leftKey, rightKey, func(L, *R) Out)
```

Example:

```go
orders := FromSlice(orderList)
users  := FromSlice(userList)

result := Collect(HashJoin(
    orders, users,
    func(o Order) int64 { return o.UserID },
    func(u User)  int64 { return u.ID },
    func(o Order, u User) OrderWithUser {
        return OrderWithUser{Order: o, UserName: u.Name}
    },
))
```

## Composable transforms (Pipe)

`Transform[In, Out]` is `func(Stream[In]) Stream[Out]` — a reusable pipeline stage.

```go
onlyActive := FilterFn(func(p Product) bool { return p.IsActive })
toName     := MapFn(func(p Product) string { return p.Name })

pipeline := Pipe(onlyActive, toName) // Transform[Product, string]

names := Collect(pipeline(FromSlice(products)))
```

## Memory notes

| Operation | Buffers entire stream? |
|-----------|------------------------|
| Map, Filter, FlatMap, Take, Skip | No (lazy) |
| SortBy, Zip, Split, Cache, GroupBy | Yes |
| HashJoin / LeftHashJoin | Right side only |
| TopN | Only top-n heap |

Use `Cache` when you need to iterate the same source more than once.
