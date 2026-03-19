package warga_computation

// Avg returns the arithmetic mean of a numeric stream.
// Returns 0 if the stream is empty.
func Avg[V Number](s Stream[V]) float64 {
	var total float64
	n := 0
	s(func(v V) bool {
		total += float64(v)
		n++
		return true
	})
	if n == 0 {
		return 0
	}
	return total / float64(n)
}
