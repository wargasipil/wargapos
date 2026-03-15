import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Receipt, Filter, CheckCircle, XCircle, ChevronRight, Truck, ChefHat } from 'lucide-react'
import { transactionClient, tableClient } from '../../client'
import { TableSelect } from '../../components/shared/TableSelect'
import { OrderFrom, OrderStatus, PaymentMethod } from '../../gen/wargapos/transaction/v1/transaction_pb'
import { toaster } from '../../components/ui/toaster'
import { formatPrice, formatTime } from '../../lib/format'
import { stripError } from '../../lib/errors'

const STATUS_FILTERS = [
  { label: 'All',       value: OrderStatus.UNSPECIFIED },
  { label: 'Pending',   value: OrderStatus.PENDING },
  { label: 'Ready',     value: OrderStatus.READY },
  { label: 'Delivered', value: OrderStatus.DELIVERED },
  { label: 'Paid',      value: OrderStatus.PAID },
  { label: 'Cancelled', value: OrderStatus.CANCELLED },
]

const SOURCE_FILTERS = [
  { label: 'All Sources', value: OrderFrom.UNSPECIFIED },
  { label: 'Guest',       value: OrderFrom.GUEST },
  { label: 'POS',         value: OrderFrom.POS },
]

export function OrdersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<OrderStatus>(OrderStatus.UNSPECIFIED)
  const [tableFilter, setTableFilter] = useState<bigint>(0n)
  const [orderFromFilter, setOrderFromFilter] = useState<OrderFrom>(OrderFrom.UNSPECIFIED)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, String(tableFilter), String(orderFromFilter), page],
    queryFn: () => transactionClient.listOrders({
      page,
      pageSize: 20,
      statusFilter,
      tableId: tableFilter,
      cashierId: 0n,
      orderFromFilter,
    }),
    staleTime: 0,
    gcTime: 0,
  })

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  // Poll for ready orders — notify staff when count increases
  const { data: readyData } = useQuery({
    queryKey: ['orders-ready-count'],
    queryFn: () => transactionClient.listOrders({ statusFilter: OrderStatus.READY, pageSize: 1, page: 1 }),
    refetchInterval: 15_000,
  })
  const prevReadyCount = useRef(0)
  useEffect(() => {
    const count = readyData?.total ?? 0
    if (prevReadyCount.current !== 0 && count > prevReadyCount.current) {
      toaster.create({ title: `🔔 ${count} order(s) ready to serve!`, type: 'info', duration: 5000 })
    }
    prevReadyCount.current = count
  }, [readyData?.total])

  const markDeliveredMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderDelivered({ orderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toaster.create({ title: 'Order marked as delivered', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const markPaidMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderPaid({ orderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toaster.create({ title: 'Order marked as paid', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const cancelMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.cancelOrder({ orderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toaster.create({ title: 'Order cancelled', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const orders = data?.orders ?? []
  const total = data?.total ?? 0
  const tables = tablesData?.tables ?? []

  function tableNameById(id: bigint): string {
    if (id === 0n) return 'Walk-in'
    return tables.find((t) => t.id === id)?.name ?? `#${String(id)}`
  }

  function statusBadge(status: OrderStatus) {
    switch (status) {
      case OrderStatus.PENDING:   return <Badge colorPalette="orange" size="sm">Pending</Badge>
      case OrderStatus.READY:     return <Badge colorPalette="blue"   size="sm">Ready</Badge>
      case OrderStatus.DELIVERED: return <Badge colorPalette="purple" size="sm">Delivered</Badge>
      case OrderStatus.PAID:      return <Badge colorPalette="green"  size="sm">Paid</Badge>
      case OrderStatus.CANCELLED: return <Badge colorPalette="red"    size="sm">Cancelled</Badge>
      default: return null
    }
  }

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack gap={2} mb={4}>
        <Receipt size={22} />
        <Heading size="md">Orders</Heading>
      </HStack>

      {/* Filter bar */}
      <Flex gap={2} mb={4} wrap="wrap" align="center">
        <HStack gap={1} flexWrap="wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFilter === f.value ? 'solid' : 'outline'}
              colorPalette={statusFilter === f.value ? 'blue' : 'gray'}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
            >
              {f.label}
            </Button>
          ))}
        </HStack>

        <HStack gap={2} ml="auto">
          {SOURCE_FILTERS.map((f) => (
            <Button
              key={String(f.value)}
              size="sm"
              variant={orderFromFilter === f.value ? 'solid' : 'outline'}
              colorPalette={orderFromFilter === f.value ? 'teal' : 'gray'}
              onClick={() => { setOrderFromFilter(f.value); setPage(1) }}
            >
              {f.label}
            </Button>
          ))}
          <HStack gap={1}>
            <Filter size={14} color="gray" />
            <TableSelect
              tables={tables}
              value={tableFilter}
              onChange={(id) => { setTableFilter(id); setPage(1) }}
              placeholder="All Tables"
            />
          </HStack>
        </HStack>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {orders.map((order) => (
            <Box
              key={String(order.id)}
              bg="white"
              borderRadius="lg"
              p={4}
              boxShadow="sm"
              cursor="pointer"
              _hover={{ boxShadow: 'md' }}
              onClick={() => navigate({ to: '/orders/$id', params: { id: String(order.id) } })}
            >
              <Flex justify="space-between" align="start" mb={2}>
                <Box>
                  <HStack gap={2} mb={1} flexWrap="wrap">
                    <Text fontWeight="semibold" fontSize="sm">#{String(order.id)}</Text>
                    {statusBadge(order.status)}
                    {order.paymentMethod === PaymentMethod.CASH && (
                      <Badge colorPalette="gray" size="sm">Cash</Badge>
                    )}
                    {order.paymentMethod === PaymentMethod.QRIS && (
                      <Badge colorPalette="purple" size="sm">QRIS</Badge>
                    )}
                    {order.orderFrom === OrderFrom.GUEST && (
                      <Badge colorPalette="teal" size="sm">Guest</Badge>
                    )}
                    {order.orderFrom === OrderFrom.POS && (
                      <Badge colorPalette="blue" size="sm">POS</Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {formatTime(order.createdAt)} · {tableNameById(order.tableId)} · {order.items.length} item(s)
                  </Text>
                  {order.customerName && (
                    <Text fontSize="xs" color="gray.600" mt={0.5}>{order.customerName}</Text>
                  )}
                </Box>
                <HStack gap={2} align="center">
                  <Text fontWeight="bold" fontSize="sm">{formatPrice(order.totalCents)}</Text>
                  <ChevronRight size={14} color="gray" />
                </HStack>
              </Flex>

              {/* Action buttons — stop propagation so clicks don't navigate */}
              {(order.status === OrderStatus.PENDING ||
                order.status === OrderStatus.READY ||
                order.status === OrderStatus.DELIVERED) && (
                <HStack gap={2} onClick={(e) => e.stopPropagation()}>
                  {order.status === OrderStatus.READY && (
                    <Button
                      size="xs"
                      colorPalette="purple"
                      loading={markDeliveredMutation.isPending}
                      onClick={() => markDeliveredMutation.mutate(order.id)}
                    >
                      <Truck size={11} />
                      Mark Delivered
                    </Button>
                  )}
                  {order.status === OrderStatus.DELIVERED && (
                    <Button
                      size="xs"
                      colorPalette="green"
                      loading={markPaidMutation.isPending}
                      onClick={() => markPaidMutation.mutate(order.id)}
                    >
                      <CheckCircle size={11} />
                      Mark as Paid
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="red"
                    loading={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(order.id)}
                  >
                    <XCircle size={11} />
                    Cancel
                  </Button>
                </HStack>
              )}
            </Box>
          ))}

          {orders.length === 0 && (
            <Flex direction="column" align="center" py={12} gap={2} color="gray.400">
              <Receipt size={32} />
              <Text fontSize="sm">No orders found.</Text>
            </Flex>
          )}
        </VStack>
      )}

      {total > 20 && (
        <HStack justify="center" mt={4} gap={2}>
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Text fontSize="sm">{page} / {Math.ceil(total / 20)}</Text>
          <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </HStack>
      )}
    </Box>
  )
}
