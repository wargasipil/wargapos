import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge, Box, Button, Drawer, Flex, Grid, Heading, HStack, IconButton, Input, InputGroup,
  Popover, Select, Spinner, Tabs, Text, VStack, createListCollection, type ListCollection,
} from '@chakra-ui/react'
import { Receipt, SlidersHorizontal, Download, X } from 'lucide-react'
import { create } from '@bufbuild/protobuf'
import { TimestampSchema } from '@bufbuild/protobuf/wkt'
import { transactionClient, tableClient, productClient } from '../../client'
import { TableSelect } from '../../components/shared/TableSelect'
import { OrderCard } from '../../components/shared/OrderCard'
import { OrderFrom, OrderStatus, PaymentMethod, PaymentStatus } from '../../gen/wargapos/transaction/v1/order_pb'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { ordersToCSV, downloadCSV } from '../../lib/csv'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'

const paymentCollection = createListCollection({ items: [
  { label: 'All Payments', value: String(PaymentStatus.UNSPECIFIED) },
  { label: 'Unpaid',       value: String(PaymentStatus.UNPAID) },
  { label: 'Paid',         value: String(PaymentStatus.PAID) },
]})

const sourceCollection = createListCollection({ items: [
  { label: 'All Sources', value: String(OrderFrom.UNSPECIFIED) },
  { label: 'Guest',       value: String(OrderFrom.GUEST) },
  { label: 'POS',         value: String(OrderFrom.POS) },
]})

const paymentMethodCollection = createListCollection({ items: [
  { label: 'Semua Metode',    value: String(PaymentMethod.UNSPECIFIED) },
  { label: 'Tunai',           value: String(PaymentMethod.CASH) },
  { label: 'Midtrans',        value: String(PaymentMethod.MIDTRANS) },
  { label: 'QRIS Manual',     value: String(PaymentMethod.MANUAL_QRIS) },
  { label: 'Transfer Manual', value: String(PaymentMethod.MANUAL_TRANSFER) },
]})

function dateToTimestamp(dateStr: string, endOfDay = false) {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return create(TimestampSchema, { seconds: BigInt(Math.floor(d.getTime() / 1000)), nanos: 0 })
}

function FilterSelect({ collection, value, onChange }: {
  collection: ListCollection<{ label: string; value: string }>
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Select.Root
      collection={collection}
      size="sm"
      value={[String(value)]}
      onValueChange={(e) => onChange(Number(e.value[0]))}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger><Select.ValueText /></Select.Trigger>
        <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText>{item.label}</Select.ItemText>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}

export function OrdersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<OrderStatus>(OrderStatus.UNSPECIFIED)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus>(PaymentStatus.UNSPECIFIED)
  const [tableFilter, setTableFilter] = useState<bigint>(0n)
  const [orderFromFilter, setOrderFromFilter] = useState<OrderFrom>(OrderFrom.UNSPECIFIED)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod>(PaymentMethod.UNSPECIFIED)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: 'delivered' | 'paid' | 'cancel'; orderId: bigint } | null>(null)

  const activeFilterCount = [
    paymentStatusFilter !== PaymentStatus.UNSPECIFIED,
    orderFromFilter !== OrderFrom.UNSPECIFIED,
    paymentMethodFilter !== PaymentMethod.UNSPECIFIED,
    tableFilter !== 0n,
    !!dateFrom || !!dateTo,
  ].filter(Boolean).length

  function resetFilters() {
    setStatusFilter(OrderStatus.UNSPECIFIED)
    setPaymentStatusFilter(PaymentStatus.UNSPECIFIED)
    setOrderFromFilter(OrderFrom.UNSPECIFIED)
    setPaymentMethodFilter(PaymentMethod.UNSPECIFIED)
    setTableFilter(0n)
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, paymentStatusFilter, paymentMethodFilter, String(tableFilter), String(orderFromFilter), dateFrom, dateTo, search, page],
    queryFn: () => transactionClient.listOrders({
      page,
      pageSize: 20,
      filter: {
        statusFilter,
        paymentStatusFilter,
        paymentMethodFilter,
        tableId: tableFilter,
        cashierId: 0,
        orderFromFilter,
        createdAtFrom: dateToTimestamp(dateFrom),
        createdAtTo: dateToTimestamp(dateTo, true),
        search,
      },
    }),
    staleTime: 0,
    gcTime: 0,
  })

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productClient.listProducts({ pageSize: 1000 }),
    staleTime: 5 * 60_000,
  })
  const skuByProductId = new Map(productsData?.products.map((p) => [p.id, p.sku]) ?? [])

  const { data: readyData } = useQuery({
    queryKey: ['orders-ready-count'],
    queryFn: () => transactionClient.listOrders({ pageSize: 1, page: 1, filter: { statusFilter: OrderStatus.PREPARED } }),
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

  // Count queries for tab badges
  const { data: countPending } = useQuery({
    queryKey: ['orders-count', 'pending'],
    queryFn: () => transactionClient.listOrders({ pageSize: 1, page: 1, filter: { statusFilter: OrderStatus.PENDING } }),
  })
  const { data: countPrepared } = useQuery({
    queryKey: ['orders-count', 'prepared'],
    queryFn: () => transactionClient.listOrders({ pageSize: 1, page: 1, filter: { statusFilter: OrderStatus.PREPARED } }),
  })
  const { data: countDelivered } = useQuery({
    queryKey: ['orders-count', 'delivered'],
    queryFn: () => transactionClient.listOrders({ pageSize: 1, page: 1, filter: { statusFilter: OrderStatus.DELIVERED } }),
  })
  const { data: countCancelled } = useQuery({
    queryKey: ['orders-count', 'cancelled'],
    queryFn: () => transactionClient.listOrders({ pageSize: 1, page: 1, filter: { statusFilter: OrderStatus.CANCELLED } }),
  })

  // Auto-refresh on live events
  useEffect(() => {
    const ac = new AbortController()
    let delay = 1000

    async function connect() {
      while (!ac.signal.aborted) {
        try {
          const stream = transactionClient.subscribe({}, { signal: ac.signal })
          for await (const res of stream) {
            delay = 1000
            const ev = res.event?.event
            if (ev?.case === 'newOrder' || ev?.case === 'updateOrder') {
              qc.invalidateQueries({ queryKey: ['orders'] })
              qc.invalidateQueries({ queryKey: ['orders-count'] })
              qc.invalidateQueries({ queryKey: ['orders-ready-count'] })
            }
          }
        } catch {
          if (ac.signal.aborted) break
          await new Promise((r) => setTimeout(r, delay))
          delay = Math.min(delay * 2, 30_000)
        }
      }
    }

    connect()
    return () => { ac.abort() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['orders'] })
    qc.invalidateQueries({ queryKey: ['orders-count'] })
    qc.invalidateQueries({ queryKey: ['orders-ready-count'] })
  }

  const markDeliveredMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderDelivered({ orderId }),
    onSuccess: () => {
      setPendingAction(null)
      invalidateAll()
      toaster.create({ title: 'Order marked as delivered', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const markPaidMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderPaid({ orderId }),
    onSuccess: () => {
      setPendingAction(null)
      invalidateAll()
      toaster.create({ title: 'Order marked as paid', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const cancelMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.cancelOrder({ orderId }),
    onSuccess: () => {
      setPendingAction(null)
      invalidateAll()
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

  async function handleExportCSV() {
    setExporting(true)
    try {
      const res = await transactionClient.listOrders({
        page: 1,
        pageSize: 1000,
        filter: {
          statusFilter,
          paymentStatusFilter,
          paymentMethodFilter,
          tableId: tableFilter,
          cashierId: 0,
          orderFromFilter,
          createdAtFrom: dateToTimestamp(dateFrom),
          createdAtTo: dateToTimestamp(dateTo, true),
          search,
        },
      })
      const csv = ordersToCSV(res.orders, tableNameById)
      downloadCSV(`orders-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    } catch (e) {
      toaster.create({ title: stripError(e), type: 'error', duration: 4000 })
    } finally {
      setExporting(false)
    }
  }

  const dateInputStyle: React.CSSProperties = {
    fontSize: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '4px 8px',
    background: 'white',
  }

  const filterBadge = activeFilterCount > 0 && (
    <Box
      as="span"
      bg="white"
      color="blue.600"
      borderRadius="full"
      px={1.5}
      fontSize="10px"
      fontWeight="bold"
      ml={1}
    >
      {activeFilterCount}
    </Box>
  )

  // Shared filter controls rendered inside both drawer and popover
  const filterBody = (
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>Payment</Text>
        <FilterSelect collection={paymentCollection} value={paymentStatusFilter}
          onChange={(v) => { setPaymentStatusFilter(v); setPage(1) }} />
      </Box>
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>Source</Text>
        <FilterSelect collection={sourceCollection} value={orderFromFilter}
          onChange={(v) => { setOrderFromFilter(v); setPage(1) }} />
      </Box>
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>Metode Bayar</Text>
        <FilterSelect collection={paymentMethodCollection} value={paymentMethodFilter}
          onChange={(v) => { setPaymentMethodFilter(v); setPage(1) }} />
      </Box>
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>Table</Text>
        <TableSelect tables={tables} value={tableFilter}
          onChange={(id) => { setTableFilter(id); setPage(1) }} placeholder="All Tables" />
      </Box>
      <Box gridColumn={{ md: 'span 2' }}>
        <Text fontSize="xs" color="gray.500" mb={1}>Date Range</Text>
        <HStack gap={2} wrap="wrap">
          <Text fontSize="xs" color="gray.500">From</Text>
          <input type="date" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} style={dateInputStyle} />
          <Text fontSize="xs" color="gray.500">To</Text>
          <input type="date" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }} style={dateInputStyle} />
          {(dateFrom || dateTo) && (
            <Button size="xs" variant="ghost"
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}>
              Clear
            </Button>
          )}
        </HStack>
      </Box>
    </Grid>
  )

  return (
    <Box p={{ base: 3, md: 6 }}>
      {/* Header + toolbar */}
      <Flex align="center" justify="space-between" mb={4} gap={2} wrap="wrap">
        <HStack gap={2} flexShrink={0}>
          <Receipt size={22} />
          <Heading size="md">Orders</Heading>
        </HStack>

        <HStack gap={2} flex={1} justify="flex-end">
          {/* Inline search */}
          <InputGroup
            maxW="200px"
            flex={1}
            endElement={
              search
                ? <IconButton size="xs" variant="ghost" aria-label="Clear" onClick={() => { setSearch(''); setPage(1) }}><X size={12} /></IconButton>
                : undefined
            }
          >
            <Input
              size="sm"
              placeholder="Cari order…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </InputGroup>

          {/* Mobile trigger — Drawer */}
          <Button
            display={{ base: 'flex', md: 'none' }}
            size="sm"
            variant={activeFilterCount > 0 ? 'solid' : 'outline'}
            colorPalette={activeFilterCount > 0 ? 'blue' : 'gray'}
            onClick={() => setDrawerOpen(true)}
          >
            <SlidersHorizontal size={14} />
            Filters
            {filterBadge}
          </Button>

          {/* Desktop trigger — Popover */}
          <Popover.Root positioning={{ placement: 'bottom-end' }}>
            <Popover.Trigger asChild>
              <Button
                display={{ base: 'none', md: 'flex' }}
                size="sm"
                variant={activeFilterCount > 0 ? 'solid' : 'outline'}
                colorPalette={activeFilterCount > 0 ? 'blue' : 'gray'}
              >
                <SlidersHorizontal size={14} />
                Filters
                {filterBadge}
              </Button>
            </Popover.Trigger>
            <Popover.Positioner>
              <Popover.Content w="440px">
                <Popover.Body p={4}>
                  {filterBody}
                </Popover.Body>
                <Flex borderTopWidth="1px" px={4} py={3} justify="space-between">
                  <Button size="sm" variant="ghost" onClick={resetFilters}>Reset All</Button>
                  <Popover.CloseTrigger asChild>
                    <Button size="sm" colorPalette="blue">Done</Button>
                  </Popover.CloseTrigger>
                </Flex>
              </Popover.Content>
            </Popover.Positioner>
          </Popover.Root>

          <Button size="sm" variant="outline" loading={exporting} onClick={handleExportCSV}>
            <Download size={14} />
            Export CSV
          </Button>
        </HStack>
      </Flex>

      {/* Status tabs */}
      <Tabs.Root
        value={String(statusFilter)}
        onValueChange={(e) => { setStatusFilter(Number(e.value) as OrderStatus); setPage(1) }}
        variant="line"
        size="sm"
        mb={3}
      >
        <Tabs.List>
          <Tabs.Trigger value={String(OrderStatus.UNSPECIFIED)}>All</Tabs.Trigger>
          <Tabs.Trigger value={String(OrderStatus.PENDING)}>
            Pending
            {(countPending?.total ?? 0) > 0 && (
              <Badge size="sm" colorPalette="orange" ml={1}>{countPending!.total}</Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value={String(OrderStatus.PREPARED)}>
            Prepared
            {(countPrepared?.total ?? 0) > 0 && (
              <Badge size="sm" colorPalette="blue" ml={1}>{countPrepared!.total}</Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value={String(OrderStatus.DELIVERED)}>
            Delivered
            {(countDelivered?.total ?? 0) > 0 && (
              <Badge size="sm" colorPalette="purple" ml={1}>{countDelivered!.total}</Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value={String(OrderStatus.CANCELLED)}>
            Cancelled
            {(countCancelled?.total ?? 0) > 0 && (
              <Badge size="sm" colorPalette="gray" ml={1}>{countCancelled!.total}</Badge>
            )}
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {/* Mobile filter drawer */}
      <Drawer.Root placement="bottom" open={drawerOpen} onOpenChange={(d) => setDrawerOpen(d.open)}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content borderTopRadius="xl" maxH="80vh">
            <Drawer.Header borderBottomWidth="1px">
              <Drawer.Title>Filter Orders</Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body overflowY="auto">
              {filterBody}
            </Drawer.Body>
            <Drawer.Footer borderTopWidth="1px" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => { resetFilters(); setDrawerOpen(false) }}>
                Reset All
              </Button>
              <Button size="sm" colorPalette="blue" onClick={() => setDrawerOpen(false)}>
                Done
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {orders.map((order) => (
            <OrderCard
              key={String(order.id)}
              order={order}
              tableName={tableNameById(order.tableId)}
              skuById={(id) => skuByProductId.get(id) ?? ''}
              onNavigate={() => navigate({ to: '/orders/$id', params: { id: String(order.id) } })}
              onMarkDelivered={() => setPendingAction({ type: 'delivered', orderId: order.id })}
              onMarkPaid={() => setPendingAction({ type: 'paid', orderId: order.id })}
              onCancel={() => setPendingAction({ type: 'cancel', orderId: order.id })}
              markDeliveredLoading={markDeliveredMutation.isPending}
              markPaidLoading={markPaidMutation.isPending}
              cancelLoading={cancelMutation.isPending}
            />
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
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === 'delivered' ? 'Tandai Terkirim?' :
          pendingAction?.type === 'paid'      ? 'Tandai Lunas?' :
                                                'Batalkan Order?'
        }
        description="Konfirmasi perubahan status order ini."
        confirmLabel={
          pendingAction?.type === 'delivered' ? 'Tandai Terkirim' :
          pendingAction?.type === 'paid'      ? 'Tandai Lunas' :
                                                'Ya, Batalkan'
        }
        loading={markDeliveredMutation.isPending || markPaidMutation.isPending || cancelMutation.isPending}
        onConfirm={() => {
          if (!pendingAction) return
          if (pendingAction.type === 'delivered') markDeliveredMutation.mutate(pendingAction.orderId)
          if (pendingAction.type === 'paid')      markPaidMutation.mutate(pendingAction.orderId)
          if (pendingAction.type === 'cancel')    cancelMutation.mutate(pendingAction.orderId)
        }}
        onCancel={() => setPendingAction(null)}
      />
    </Box>
  )
}
