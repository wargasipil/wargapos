import { useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { ArrowLeft, CheckCircle, Phone, Printer, XCircle, ChefHat, Truck } from 'lucide-react'
import { printReceipt } from '../../lib/printer'
import { transactionClient, tableClient } from '../../client'
import { OrderStatus, PaymentStatus, OrderFrom } from '../../gen/wargapos/transaction/v1/transaction_pb'
import { toaster } from '../../components/ui/toaster'
import { formatPrice, formatTime, formatDateTime, paymentMethodLabel, paymentMethodColor } from '../../lib/format'
import { stripError } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'

function statusBadge(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:   return <Badge colorPalette="orange" size="sm">Pending</Badge>
    case OrderStatus.PREPARED:  return <Badge colorPalette="blue"   size="sm">Prepared</Badge>
    case OrderStatus.DELIVERED: return <Badge colorPalette="purple" size="sm">Delivered</Badge>
    case OrderStatus.CANCELLED: return <Badge colorPalette="red"    size="sm">Cancelled</Badge>
    default: return null
  }
}

function paymentBadge(ps: PaymentStatus) {
  switch (ps) {
    case PaymentStatus.PAID:     return <Badge colorPalette="green"  size="sm">Paid</Badge>
    case PaymentStatus.REFUNDED: return <Badge colorPalette="gray"   size="sm">Refunded</Badge>
    default:                     return <Badge colorPalette="orange" size="sm">Unpaid</Badge>
  }
}

export function OrderDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => transactionClient.getOrder({ orderId: BigInt(id) }),
  })

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['orders'] })
    qc.invalidateQueries({ queryKey: ['order', id] })
    qc.invalidateQueries({ queryKey: ['orders-ready-count'] })
  }

  const [confirmAction, setConfirmAction] = useState<'prepared' | 'delivered' | 'paid' | 'cancel' | null>(null)

  const markReadyMutation = useMutation({
    mutationFn: () => transactionClient.markOrderReady({ orderId: BigInt(id) }),
    onSuccess: () => { setConfirmAction(null); invalidate(); toaster.create({ title: 'Order marked as ready', type: 'success', duration: 3000 }) },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const markDeliveredMutation = useMutation({
    mutationFn: () => transactionClient.markOrderDelivered({ orderId: BigInt(id) }),
    onSuccess: () => { setConfirmAction(null); invalidate(); toaster.create({ title: 'Order marked as delivered', type: 'success', duration: 3000 }) },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const markPaidMutation = useMutation({
    mutationFn: () => transactionClient.markOrderPaid({ orderId: BigInt(id) }),
    onSuccess: () => { setConfirmAction(null); invalidate(); toaster.create({ title: 'Order marked as paid', type: 'success', duration: 3000 }) },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => transactionClient.cancelOrder({ orderId: BigInt(id) }),
    onSuccess: () => {
      setConfirmAction(null)
      invalidate()
      toaster.create({ title: 'Order cancelled', type: 'success', duration: 3000 })
      navigate({ to: '/orders' })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const [printing, setPrinting] = useState(false)

  const order = data?.order
  const tables = tablesData?.tables ?? []

  function tableNameById(tableId: bigint): string {
    if (tableId === 0n) return 'Walk-in'
    return tables.find((t) => t.id === tableId)?.name ?? `#${String(tableId)}`
  }

  async function handlePrint() {
    if (!order) return
    setPrinting(true)
    try {
      await printReceipt(order, tableNameById(order.tableId))
      toaster.create({ title: 'Struk berhasil dicetak', type: 'success', duration: 3000 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mencetak struk'
      toaster.create({ title: msg, type: 'error', duration: 5000 })
    } finally {
      setPrinting(false)
    }
  }

  if (isLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (!order) return <Box p={6}><Text color="gray.500">Order not found.</Text></Box>

  const canCancel =
    order.status === OrderStatus.PENDING ||
    order.status === OrderStatus.PREPARED ||
    order.status === OrderStatus.DELIVERED

  return (
    <Box p={{ base: 3, md: 6 }} maxW="640px">
      {/* Header */}
      <HStack gap={3} mb={5}>
        <Link to="/orders">
          <Button size="sm" variant="ghost" px={2}>
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <Heading size="md">Order #{String(order.id)}</Heading>
        {statusBadge(order.status)}
        {paymentBadge(order.paymentStatus)}
      </HStack>

      {/* Meta */}
      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" mb={4}>
        <VStack align="stretch" gap={2}>
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">Date</Text>
            <Text fontSize="sm">{formatDateTime(order.createdAt)}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">Table</Text>
            <Text fontSize="sm">{tableNameById(order.tableId)}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">Source</Text>
            <Badge colorPalette={order.orderFrom === OrderFrom.GUEST ? 'teal' : 'blue'} size="sm">
              {order.orderFrom === OrderFrom.GUEST ? 'Guest' : 'POS'}
            </Badge>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">Payment</Text>
            <Badge colorPalette={paymentMethodColor(order.paymentMethod)} size="sm">
              {paymentMethodLabel(order.paymentMethod)}
            </Badge>
          </Flex>
          {order.customerName && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">Customer</Text>
              <Text fontSize="sm">{order.customerName}</Text>
            </Flex>
          )}
          {order.phoneNumber && (
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">Phone</Text>
              <HStack gap={1}>
                <Phone size={12} color="gray" />
                <Text fontSize="sm">
                  <a href={`tel:${order.phoneNumber}`}>{order.phoneNumber}</a>
                </Text>
              </HStack>
            </Flex>
          )}
        </VStack>
      </Box>

      {/* Items */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" mb={4} overflow="hidden">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Item</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Qty</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Unit</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Subtotal</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {order.items.map((item) => (
              <Table.Row key={String(item.id)}>
                <Table.Cell>
                  <Text fontSize="sm">{item.productName}</Text>
                  {item.notes && <Text fontSize="xs" color="gray.400">↳ {item.notes}</Text>}
                </Table.Cell>
                <Table.Cell textAlign="center"><Text fontSize="sm">{item.quantity}</Text></Table.Cell>
                <Table.Cell textAlign="right"><Text fontSize="sm">{formatPrice(item.unitPriceCents)}</Text></Table.Cell>
                <Table.Cell textAlign="right"><Text fontSize="sm">{formatPrice(item.subtotalCents)}</Text></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <Flex justify="space-between" px={4} py={3} borderTopWidth={1} borderColor="gray.100">
          <Text fontWeight="semibold" fontSize="sm">Total</Text>
          <Text fontWeight="bold" fontSize="sm">{formatPrice(order.totalCents)}</Text>
        </Flex>
      </Box>

      {/* Actions */}
      <HStack gap={2} justify="flex-end">
        <Button size="sm" variant="outline" loading={printing} onClick={handlePrint} mr="auto">
          <Printer size={14} />
          Print
        </Button>
        {order.status === OrderStatus.PENDING && (
          <Button size="sm" colorPalette="blue" onClick={() => setConfirmAction('prepared')}>
            <ChefHat size={14} />
            Mark Prepared
          </Button>
        )}
        {order.status === OrderStatus.PREPARED && (
          <Button size="sm" colorPalette="purple" onClick={() => setConfirmAction('delivered')}>
            <Truck size={14} />
            Mark Delivered
          </Button>
        )}
        {order.paymentStatus === PaymentStatus.UNPAID && order.status !== OrderStatus.CANCELLED && (
          <Button size="sm" colorPalette="green" onClick={() => setConfirmAction('paid')}>
            <CheckCircle size={14} />
            Mark as Paid
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="outline" colorPalette="red" onClick={() => setConfirmAction('cancel')}>
            <XCircle size={14} />
            Cancel Order
          </Button>
        )}
      </HStack>

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === 'prepared'  ? 'Tandai Siap?' :
          confirmAction === 'delivered' ? 'Tandai Terkirim?' :
          confirmAction === 'paid'      ? 'Tandai Lunas?' :
                                          'Batalkan Order?'
        }
        description={
          confirmAction === 'cancel'
            ? <>Order <strong>#{String(order.id)}</strong> akan dibatalkan.</>
            : 'Konfirmasi perubahan status order ini.'
        }
        confirmLabel={
          confirmAction === 'prepared'  ? 'Tandai Siap' :
          confirmAction === 'delivered' ? 'Tandai Terkirim' :
          confirmAction === 'paid'      ? 'Tandai Lunas' :
                                          'Ya, Batalkan'
        }
        loading={
          markReadyMutation.isPending ||
          markDeliveredMutation.isPending ||
          markPaidMutation.isPending ||
          cancelMutation.isPending
        }
        onConfirm={() => {
          if (confirmAction === 'prepared')  markReadyMutation.mutate()
          if (confirmAction === 'delivered') markDeliveredMutation.mutate()
          if (confirmAction === 'paid')      markPaidMutation.mutate()
          if (confirmAction === 'cancel')    cancelMutation.mutate()
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </Box>
  )
}
