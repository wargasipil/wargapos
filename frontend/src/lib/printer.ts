import type { Order } from '../gen/wargapos/transaction/v1/transaction_pb'
import { deviceClient } from '../client'
import { PaymentMethod, PaymentStatus } from '../gen/wargapos/transaction/v1/transaction_pb'
import { formatPrice, formatTime } from './format'

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

function buildReceipt(order: Order, tableName: string): Uint8Array {
  const method = order.paymentMethod === PaymentMethod.ONLINE ? 'Online' : 'Cash'
  const paid = order.paymentStatus === PaymentStatus.PAID ? 'Paid' : 'Unpaid'
  const payment = `${method} - ${paid}`
  const parts: Uint8Array[] = [
    CMD_INIT,
    CMD_CENTER, CMD_BOLD_ON,  lf('WargaPOS'), CMD_BOLD_OFF,
    CMD_LEFT,   sep(),
    lf(`Order  : #${String(order.id)}`),
    lf(`Date   : ${formatTime(order.createdAt)}`),
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
  parts.push(
    sep(),
    CMD_BOLD_ON,  lf(rowLR('TOTAL', total)), CMD_BOLD_OFF,
    sep(),
    CMD_CENTER,   lf(center('Terima kasih!')),
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
): Promise<void> {
  const data = buildReceipt(order, tableName)
  await deviceClient.print({
    printer: { deviceId: printer.deviceId, name: printer.name },
    data: { case: 'raw', value: data },
  })
}
