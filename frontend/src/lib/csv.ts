import type { Product } from '../gen/wargapos/product/v1/product_pb'
import type { Order } from '../gen/wargapos/transaction/v1/order_pb'
import { OrderStatus, PaymentStatus, OrderFrom } from '../gen/wargapos/transaction/v1/order_pb'
import { formatDateTime, paymentMethodLabel } from './format'

function escapeCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}

function csvRow(cells: string[]): string {
  return cells.map(escapeCell).join(',')
}

function statusLabel(s: OrderStatus): string {
  switch (s) {
    case OrderStatus.PENDING:   return 'Pending'
    case OrderStatus.PREPARED:  return 'Prepared'
    case OrderStatus.DELIVERED: return 'Delivered'
    case OrderStatus.CANCELLED: return 'Cancelled'
    default: return String(s)
  }
}

export function productsToCSV(
  products: Product[],
  categoryNameById: (id: bigint) => string,
): string {
  const header = csvRow(['ID', 'Name', 'SKU', 'Category', 'Price (IDR)', 'COGS (IDR)', 'Margin %', 'Stock', 'Status', 'Description'])
  const lines = products.map((p) => {
    const price = Number(p.priceCents) / 100
    const cogs  = Number(p.cogsCents)  / 100
    const margin = price > 0 ? Math.round((price - cogs) * 100 / price) : 0
    return csvRow([
      String(p.id),
      p.name,
      p.sku,
      categoryNameById(p.categoryId),
      String(price),
      String(cogs),
      String(margin),
      String(p.stockQty),
      p.isActive ? 'Active' : 'Inactive',
      p.description,
    ])
  })
  return [header, ...lines].join('\n')
}

export function ordersToCSV(orders: Order[], tableNameById: (id: bigint) => string): string {
  const header = csvRow([
    'ID', 'Date', 'Table', 'Customer', 'Phone',
    'Source', 'Status', 'Payment Status', 'Payment Method', 'Total (IDR)',
  ])
  const lines = orders.map((o) => csvRow([
    String(o.id),
    formatDateTime(o.createdAt),
    tableNameById(o.tableId),
    o.customerName,
    o.phoneNumber,
    o.orderFrom === OrderFrom.GUEST ? 'Guest' : 'POS',
    statusLabel(o.status),
    o.paymentStatus === PaymentStatus.PAID ? 'Paid'
      : o.paymentStatus === PaymentStatus.REFUNDED ? 'Refunded'
      : 'Unpaid',
    paymentMethodLabel(o.paymentMethod),
    String(Number(o.totalCents) / 100),
  ]))
  return [header, ...lines].join('\n')
}

export function downloadCSV(filename: string, content: string): void {
  // BOM prefix ensures Excel opens UTF-8 correctly
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
