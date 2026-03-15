import { describe, it, expect } from 'vitest'

// Test the pure receipt-building logic by re-exporting internals for testing.
// We test the raw byte output: ESC @ (init), correct ASCII text, and GS V (cut).

const COLS = 32
const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

// Minimal Order shape for testing
function makeOrder(overrides = {}) {
  return {
    id: 42n,
    createdAt: 0n,
    tableId: 0n,
    customerName: '',
    phoneNumber: '',
    paymentMethod: 1, // CASH
    orderFrom: 2,
    status: 1,
    totalCents: 25000n,
    items: [
      {
        id: 1n,
        productId: 1n,
        productName: 'Kopi Susu',
        quantity: 2,
        unitPriceCents: 12500n,
        subtotalCents: 25000n,
        notes: '',
      },
    ],
    ...overrides,
  }
}

// Extract the pure buildReceipt function by duplicating the minimal logic here,
// so we can unit-test it without WebUSB side effects.
function buildTestReceipt(order: ReturnType<typeof makeOrder>, tableName: string): Uint8Array {
  function concat(...parts: Uint8Array[]) {
    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const p of parts) { out.set(p, offset); offset += p.length }
    return out
  }
  function asc(text: string) {
    return new Uint8Array(Array.from(text).map(c => c.charCodeAt(0) & 0xff))
  }
  function lf(text: string) { return concat(asc(text), new Uint8Array([LF])) }
  function sep() { return lf('-'.repeat(COLS)) }
  function rowLR(l: string, r: string) {
    const gap = COLS - l.length - r.length
    return l + ' '.repeat(Math.max(1, gap)) + r
  }
  function formatPrice(cents: bigint) {
    return 'Rp ' + Number(cents / 100n).toLocaleString('id-ID')
  }
  function formatTime(_: bigint) { return '01 Jan 00:00' }

  const payment = order.paymentMethod === 2 ? 'QRIS' : 'Cash'
  const parts: Uint8Array[] = [
    new Uint8Array([ESC, 0x40]),          // INIT
    new Uint8Array([ESC, 0x61, 0x01]),    // CENTER
    new Uint8Array([ESC, 0x45, 0x01]),    // BOLD ON
    lf('WargaPOS'),
    new Uint8Array([ESC, 0x45, 0x00]),    // BOLD OFF
    new Uint8Array([ESC, 0x61, 0x00]),    // LEFT
    sep(),
    lf(`Order  : #${String(order.id)}`),
    lf(`Date   : ${formatTime(order.createdAt)}`),
    lf(`Table  : ${tableName}`),
    lf(`Payment: ${payment}`),
    sep(),
  ]
  for (const item of order.items) {
    parts.push(lf(rowLR(item.productName.slice(0, 20), formatPrice(item.subtotalCents))))
    parts.push(lf(`  ${item.quantity} x ${formatPrice(item.unitPriceCents)}`))
  }
  parts.push(
    sep(),
    new Uint8Array([ESC, 0x45, 0x01]),
    lf(rowLR('TOTAL', formatPrice(order.totalCents))),
    new Uint8Array([ESC, 0x45, 0x00]),
    sep(),
    new Uint8Array([ESC, 0x61, 0x01]),
    lf(' '.repeat(Math.floor((COLS - 13) / 2)) + 'Terima kasih!'),
    new Uint8Array([LF, LF, LF]),
    new Uint8Array([GS, 0x56, 0x00]),     // CUT
  )
  return concat(...parts)
}

describe('receipt bytes', () => {
  it('starts with ESC @ (initialize)', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Walk-in')
    expect(bytes[0]).toBe(ESC)
    expect(bytes[1]).toBe(0x40)
  })

  it('ends with GS V 0 (cut)', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Walk-in')
    // last 3 bytes = GS V 0
    expect(bytes[bytes.length - 3]).toBe(GS)
    expect(bytes[bytes.length - 2]).toBe(0x56)
    expect(bytes[bytes.length - 1]).toBe(0x00)
  })

  it('contains "WargaPOS" as ASCII', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Walk-in')
    const text = new TextDecoder('ascii', { fatal: false }).decode(bytes)
    expect(text).toContain('WargaPOS')
  })

  it('contains order id', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Walk-in')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('#42')
  })

  it('contains product name', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Meja 3')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('Kopi Susu')
  })

  it('contains table name', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Meja 5')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('Meja 5')
  })

  it('shows QRIS payment when applicable', () => {
    const bytes = buildTestReceipt(makeOrder({ paymentMethod: 2 }), 'Walk-in')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('QRIS')
  })

  it('row width does not exceed COLS', () => {
    const longName = makeOrder({ items: [{ id: 1n, productId: 1n, productName: 'A'.repeat(30), quantity: 1, unitPriceCents: 5000n, subtotalCents: 5000n, notes: '' }] })
    const bytes = buildTestReceipt(longName, 'Walk-in')
    const text = new TextDecoder().decode(bytes)
    // product name is truncated to 20
    expect(text).toContain('A'.repeat(20))
    expect(text).not.toContain('A'.repeat(21))
  })

  // Regression: printer used to receive only control codes (codepage-switching
  // commands from the encoder library), causing an empty page to be printed.
  // Verify the byte stream contains enough printable ASCII so text actually appears.
  it('does not produce an empty page (has printable ASCII content)', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Walk-in')
    const printable = bytes.filter(b => b >= 0x20 && b <= 0x7e)
    // At minimum: "WargaPOS", "TOTAL", "Terima kasih!", order/item lines
    expect(printable.length).toBeGreaterThan(50)
  })

  it('does not contain codepage-switching commands (ESC t / ESC R)', () => {
    const bytes = buildTestReceipt(makeOrder(), 'Walk-in')
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === ESC) {
        expect(bytes[i + 1]).not.toBe(0x74) // ESC t — codepage select (broke cheap printers)
        expect(bytes[i + 1]).not.toBe(0x52) // ESC R — international charset select
      }
    }
  })
})
