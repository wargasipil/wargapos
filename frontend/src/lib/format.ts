export function formatPrice(cents: bigint): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(cents))
}

/**
 * Format a Unix timestamp (bigint seconds) as:
 *   - "HH:mm" if today
 *   - "D MMM HH:mm" if another day
 */
export function formatTime(unix: bigint): string {
  const d = new Date(Number(unix) * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${time}`
}
