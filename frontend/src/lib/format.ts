import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { timestampDate } from '@bufbuild/protobuf/wkt'

export function formatPrice(cents: bigint): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(cents))
}

function toDate(ts: Timestamp | undefined): Date {
  if (!ts) return new Date(0)
  return timestampDate(ts)
}

/**
 * Relative for < 60 min; absolute time for older-today; date+time for past days.
 */
export function formatTime(ts: Timestamp | undefined): string {
  const d = toDate(ts)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60_000)

  if (diffMins < 1)  return 'Baru saja'
  if (diffMins < 60) return `${diffMins} mnt lalu`

  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return time
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${time}`
}

/**
 * Always full date+time — for detail views. e.g. "17 Mar 2026, 14.30"
 */
export function formatDateTime(ts: Timestamp | undefined): string {
  const d = toDate(ts)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', '
    + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
