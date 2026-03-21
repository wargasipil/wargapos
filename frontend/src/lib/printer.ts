import type { Order } from '../gen/wargapos/transaction/v1/order_pb'
import { deviceClient } from '../client'
import { PaymentMethod, PaymentStatus } from '../gen/wargapos/transaction/v1/order_pb'
import { formatPrice, formatDateTime, paymentMethodLabel } from './format'

// 58mm paper = 32 chars per line
const COLS = 32

// Raw ESC/POS commands — works on any ESC/POS printer
const CMD_INIT     = new Uint8Array([0x1b, 0x40])           // ESC @  — initialize
const CMD_CENTER   = new Uint8Array([0x1b, 0x61, 0x01])     // ESC a 1 — center
const CMD_LEFT     = new Uint8Array([0x1b, 0x61, 0x00])     // ESC a 0 — left
const CMD_BOLD_ON  = new Uint8Array([0x1b, 0x45, 0x01])     // ESC E 1 — bold on
const CMD_BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00])     // ESC E 0 — bold off
const CMD_LF       = new Uint8Array([0x0a])                  // LF
const CMD_CUT      = new Uint8Array([0x1d, 0x56, 0x00])     // GS V 0  — full cut

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) { out.set(p, offset); offset += p.length }
  return out
}

function ascii(text: string): Uint8Array {
  return new Uint8Array(Array.from(text).map(c => c.charCodeAt(0) & 0xff))
}

function lf(text: string): Uint8Array {
  return concat(ascii(text), CMD_LF)
}

function sep(): Uint8Array {
  return lf('-'.repeat(COLS))
}

function center(text: string): string {
  const pad = Math.max(0, Math.floor((COLS - text.length) / 2))
  return ' '.repeat(pad) + text
}

function rowLR(left: string, right: string): string {
  const gap = COLS - left.length - right.length
  return left + ' '.repeat(Math.max(1, gap)) + right
}

export interface PrinterOpts {
  title?:       string
  description?: string
  address?:     string
  address2?:    string
  contact?:     string
  footer?:      string
}

function buildReceipt(order: Order, tableName: string, opts?: PrinterOpts): Uint8Array {
  const method = paymentMethodLabel(order.paymentMethod)
  const paid = order.paymentStatus === PaymentStatus.PAID ? 'Paid' : 'Unpaid'
  const payment = `${method} - ${paid}`

  const title       = opts?.title       || 'WargaPOS'
  const description = opts?.description || 'Café Point of Sale'
  const footer      = opts?.footer      || 'Terima kasih!'

  const parts: Uint8Array[] = [
    CMD_INIT,
    CMD_CENTER, CMD_BOLD_ON, lf(center(title.slice(0, COLS))), CMD_BOLD_OFF,
    lf(center(description.slice(0, COLS))),
    ...(opts?.address  ? [lf(center(opts.address.slice(0, COLS)))]  : []),
    ...(opts?.address2 ? [lf(center(opts.address2.slice(0, COLS)))] : []),
    ...(opts?.contact  ? [lf(center(opts.contact.slice(0, COLS)))]  : []),
    CMD_LEFT, sep(),
    CMD_BOLD_ON, lf(`Order  : #${String(order.id)}`), CMD_BOLD_OFF,
    lf(`Date   : ${formatDateTime(order.createdAt)}`),
    lf(`Table  : ${tableName}`),
    lf(`Payment: ${payment}`),
    ...(order.customerName ? [lf(`Name   : ${order.customerName.slice(0, COLS - 9)}`)] : []),
    ...(order.phoneNumber  ? [lf(`Phone  : ${order.phoneNumber.slice(0, COLS - 9)}`)]  : []),
    sep(),
  ]

  for (const item of order.items) {
    const name = item.productName.slice(0, 20)
    const sub  = formatPrice(item.subtotalCents)
    parts.push(lf(rowLR(name, sub)))
    parts.push(lf(`  ${item.quantity} x ${formatPrice(item.unitPriceCents)}`))
    if (item.notes) {
      parts.push(lf(`  * ${item.notes.slice(0, COLS - 4)}`))
    }
  }

  const total = formatPrice(order.totalCents)
  const cashRows: Uint8Array[] = order.paymentMethod === PaymentMethod.CASH && order.cashTenderedCents > 0n
    ? [
        lf(rowLR('Tunai', formatPrice(order.cashTenderedCents))),
        lf(rowLR('Kembalian', formatPrice(order.changeCents))),
      ]
    : []
  parts.push(
    sep(),
    CMD_BOLD_ON,  lf(rowLR('TOTAL', total)), CMD_BOLD_OFF,
    ...cashRows,
    sep(),
    CMD_CENTER,   lf(center(footer.slice(0, COLS))),
    CMD_LF, CMD_LF, CMD_LF,
    CMD_CUT,
  )

  return concat(...parts)
}

let cachedDevice: USBDevice | null = null

export async function printReceipt(order: Order, tableName: string): Promise<void> {
  if (!navigator.usb) {
    throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome atau Edge.')
  }

  if (!cachedDevice) {
    cachedDevice = await navigator.usb.requestDevice({ filters: [] })
  }

  const data = buildReceipt(order, tableName)

  try {
    await cachedDevice.open()
    if (cachedDevice.configuration === null) {
      await cachedDevice.selectConfiguration(1)
    }

    // Auto-discover the OUT endpoint instead of hardcoding
    const iface = cachedDevice.configuration!.interfaces[0]
    await cachedDevice.claimInterface(iface.interfaceNumber)
    const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out')
    if (!endpoint) throw new Error('Endpoint OUT tidak ditemukan pada printer.')

    await cachedDevice.transferOut(endpoint.endpointNumber, new Uint8Array(data))
    await cachedDevice.releaseInterface(iface.interfaceNumber)
    await cachedDevice.close()
  } catch (err) {
    cachedDevice = null
    throw err
  }
}

// printReceiptRemote sends ESC/POS bytes via the device service (main server routes to connector).
export async function printReceiptRemote(
  order: Order,
  tableName: string,
  printer: { deviceId: string; name: string },
  opts?: PrinterOpts,
): Promise<void> {
  const data = buildReceipt(order, tableName, opts)
  await deviceClient.print({
    printer: { deviceId: printer.deviceId, name: printer.name },
    data: { case: 'raw', value: data },
  })
}
