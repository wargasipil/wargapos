import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Flex, Heading, HStack, NativeSelect, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Receipt, Phone, ChevronDown, ChevronUp, CheckCircle, Filter } from 'lucide-react'
import { transactionClient, tableClient } from '../../client'
import { OrderFrom, PaymentMethod } from '../../gen/wargapos/transaction/v1/transaction_pb'
import { toaster } from '../../components/ui/toaster'
import { formatPrice, formatTime } from '../../lib/format'
import { stripError } from '../../lib/errors'

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
]

const SOURCE_FILTERS = [
  { label: 'All Sources', value: OrderFrom.UNSPECIFIED },
  { label: 'Guest', value: OrderFrom.GUEST },
  { label: 'POS', value: OrderFrom.POS },
]

export function OrdersPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [tableFilter, setTableFilter] = useState<bigint>(0n)
  const [orderFromFilter, setOrderFromFilter] = useState<OrderFrom>(OrderFrom.UNSPECIFIED)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<bigint | null>(null)

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
  })

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  const markPaidMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderPaid({ orderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['orders-pending'] })
      qc.invalidateQueries({ queryKey: ['orders-paid'] })
      toaster.create({ title: 'Order marked as paid', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const orders = data?.orders ?? []
  const total = data?.total ?? 0
  const tables = tablesData?.tables ?? []

  function tableNameById(id: bigint): string {
    if (id === 0n) return '—'
    return tables.find((t) => t.id === id)?.name ?? `#${String(id)}`
  }

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack gap={2} mb={4}>
        <Receipt size={22} />
        <Heading size="md">Orders</Heading>
      </HStack>

      {/* Filters */}
      <Flex gap={2} mb={4} wrap="wrap" align="center">
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
          <NativeSelect.Root size="sm" w="auto" minW="130px">
            <NativeSelect.Field
              value={String(tableFilter)}
              onChange={(e) => { setTableFilter(e.target.value ? BigInt(e.target.value) : 0n); setPage(1) }}
            >
              <option value="">All Tables</option>
              {tables.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {orders.map((order) => (
            <Box key={String(order.id)} bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <Flex justify="space-between" align="start" mb={2}>
                <Box>
                  <HStack gap={2} mb={1} flexWrap="wrap">
                    <Text fontWeight="semibold" fontSize="sm">#{String(order.id)}</Text>
                    <Badge
                      colorPalette={order.status === 1 ? 'orange' : order.status === 2 ? 'green' : 'gray'}
                      size="sm"
                    >
                      {order.status === 1 ? 'Pending' : order.status === 2 ? 'Paid' : 'Unknown'}
                    </Badge>
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
                    {formatTime(order.createdAt)} · Table: {tableNameById(order.tableId)}
                  </Text>
                  {order.customerName && (
                    <Text fontSize="xs" color="gray.600" fontWeight="medium" mt={0.5}>
                      Guest: {order.customerName}
                    </Text>
                  )}
                  {order.phoneNumber && (
                    <HStack gap={1} mt={0.5}>
                      <Phone size={10} color="gray" />
                      <Text fontSize="xs" color="gray.500">
                        <a href={`tel:${order.phoneNumber}`}>{order.phoneNumber}</a>
                      </Text>
                    </HStack>
                  )}
                </Box>
                <Text fontWeight="bold" fontSize="sm">{formatPrice(order.totalCents)}</Text>
              </Flex>

              <Flex gap={2} align="center">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  {expandedId === order.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {expandedId === order.id ? 'Hide items' : `${order.items.length} item(s)`}
                </Button>
                {order.status === 1 && (
                  <Button
                    size="xs"
                    colorPalette="green"
                    loading={markPaidMutation.isPending}
                    onClick={() => markPaidMutation.mutate(order.id)}
                  >
                    <CheckCircle size={12} />
                    Mark as Paid
                  </Button>
                )}
              </Flex>

              {expandedId === order.id && order.items.length > 0 && (
                <Box mt={2} pl={2} borderLeft="2px solid" borderColor="gray.100">
                  {order.items.map((item) => (
                    <Box key={String(item.id)} py={0.5}>
                      <HStack justify="space-between">
                        <Text fontSize="xs">{item.productName} × {item.quantity}</Text>
                        <Text fontSize="xs" color="gray.500">{formatPrice(item.subtotalCents)}</Text>
                      </HStack>
                      {item.notes && (
                        <Text fontSize="xs" color="gray.400" pl={2}>↳ {item.notes}</Text>
                      )}
                    </Box>
                  ))}
                </Box>
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

      {/* Pagination */}
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
