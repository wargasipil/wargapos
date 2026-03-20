import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Tabs, Text, VStack, useBreakpointValue,
} from '@chakra-ui/react'
import { ChefHat, Maximize2, Minimize2, Radio, RefreshCw } from 'lucide-react'
import { transactionClient, tableClient, productClient } from '../client'
import { OrderStatus, LostOrdersSort_SortBy } from '../gen/wargapos/transaction/v1/order_pb'
import { toaster } from '../components/ui/toaster'
import { stripError } from '../lib/errors'
import { KitchenCard } from '../components/shared/KitchenCard'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    osc.connect(ctx.destination)
    osc.frequency.value = 880
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch { /* ignore if audio not available */ }
}

type LiveStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

const kitchenSort = { sortBy: LostOrdersSort_SortBy.ORDERID, descending: false }

export function KitchenPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'delivering'>('pending')
  const [readyTarget, setReadyTarget] = useState<bigint | null>(null)
  const [deliveredTarget, setDeliveredTarget] = useState<bigint | null>(null)
  const [live, setLive] = useState(() => localStorage.getItem('kitchen-live') === '1')
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle')

  const { data: pendingData, isLoading: pendingLoading, dataUpdatedAt } = useQuery({
    queryKey: ['kitchen-orders', 'pending'],
    queryFn: () => transactionClient.listOrders({
      pageSize: 50, page: 1,
      filter: { statusFilter: OrderStatus.PENDING },
      sort: kitchenSort,
    }),
    staleTime: 0,
  })

  const { data: deliveringData, isLoading: deliveringLoading } = useQuery({
    queryKey: ['kitchen-orders', 'delivering'],
    queryFn: () => transactionClient.listOrders({
      pageSize: 50, page: 1,
      filter: { statusFilter: OrderStatus.PREPARED },
      sort: kitchenSort,
    }),
    staleTime: 0,
  })

  // Live subscription
  useEffect(() => {
    if (!live) {
      setLiveStatus('idle')
      return
    }
    const ac = new AbortController()
    let delay = 1000

    async function connect() {
      while (!ac.signal.aborted) {
        try {
          setLiveStatus('connecting')
          const stream = transactionClient.subscribe({}, { signal: ac.signal })
          for await (const res of stream) {
            setLiveStatus('connected')
            delay = 1000
            const ev = res.event?.event
            if (ev?.case === 'newOrder') {
              beep()
              qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
            } else if (ev?.case === 'updateOrder') {
              qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
            }
          }
        } catch {
          if (ac.signal.aborted) break
          setLiveStatus('reconnecting')
          await new Promise((r) => setTimeout(r, delay))
          delay = Math.min(delay * 2, 30_000)
        }
      }
    }

    connect()
    return () => { ac.abort() }
  }, [live]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync fullscreen icon + auto-live
  useEffect(() => {
    function onFsChange() {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      setLive(fs)
      localStorage.setItem('kitchen-live', fs ? '1' : '0')
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

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

  const markReadyMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderReady({ orderId }),
    onSuccess: () => {
      setReadyTarget(null)
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['orders-ready-count'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toaster.create({ title: 'Order marked as ready', type: 'success', duration: 2000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const markDeliveredMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderDelivered({ orderId }),
    onSuccess: () => {
      setDeliveredTarget(null)
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toaster.create({ title: 'Order marked as delivered', type: 'success', duration: 2000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const tables = tablesData?.tables ?? []

  function tableNameById(id: bigint): string {
    if (id === 0n) return 'Walk-in'
    return tables.find((t) => t.id === id)?.name ?? `#${String(id)}`
  }

  function toggleLive() {
    const next = !live
    setLive(next)
    localStorage.setItem('kitchen-live', next ? '1' : '0')
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const updatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  const liveLabel = !live ? 'Go Live'
    : liveStatus === 'connecting' ? 'Connecting...'
    : liveStatus === 'reconnecting' ? 'Reconnecting...'
    : 'Live'

  const pendingCount = pendingData?.total ?? 0
  const deliveringCount = deliveringData?.total ?? 0

  const orders = activeTab === 'pending' ? (pendingData?.orders ?? []) : (deliveringData?.orders ?? [])
  const isLoading = activeTab === 'pending' ? pendingLoading : deliveringLoading
  const columnCount = useBreakpointValue({ base: 1, sm: 2, lg: 3 }) ?? 3
  const columns = Array.from({ length: columnCount }, (_, col) =>
    orders.filter((_, i) => i % columnCount === col)
  )

  return (
    <Box p={{ base: 3, md: 6 }} minH="100%">
      {/* Header */}
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={2}>
        <HStack gap={3}>
          <ChefHat size={28} color="#f97316" />
          <Heading size="lg">Kitchen Display</Heading>
        </HStack>
        <HStack gap={2}>
          <Button
            size="xs"
            colorPalette={live ? 'green' : 'gray'}
            variant={live ? 'solid' : 'outline'}
            onClick={toggleLive}
          >
            <Radio size={12} />
            {liveLabel}
          </Button>
          {!live && (
            <Button size="xs" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ['kitchen-orders'] })}>
              <RefreshCw size={12} />
            </Button>
          )}
          <Text color="gray.400" fontSize="xs">Updated {updatedTime}</Text>
          <Button size="xs" variant="ghost" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </Button>
        </HStack>
      </Flex>

      {/* Status tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(e) => setActiveTab(e.value as 'pending' | 'delivering')}
        variant="line"
        size="sm"
        mb={4}
      >
        <Tabs.List>
          <Tabs.Trigger value="pending">
            Pending
            {pendingCount > 0 && (
              <Badge colorPalette="orange" size="sm" ml={1}>{pendingCount}</Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="delivering">
            Delivering
            {deliveringCount > 0 && (
              <Badge colorPalette="blue" size="sm" ml={1}>{deliveringCount}</Badge>
            )}
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {isLoading ? (
        <Flex justify="center" mt={16}><Spinner size="lg" /></Flex>
      ) : orders.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py={20} gap={3} color="gray.400">
          <ChefHat size={48} />
          <Text fontSize="lg" fontWeight="medium">
            {activeTab === 'pending' ? 'All clear — no pending orders' : 'No orders being delivered'}
          </Text>
        </Flex>
      ) : (
        <HStack align="start" gap={4}>
          {columns.map((col, i) => (
            <VStack key={i} flex={1} gap={4} align="stretch">
              {col.map((order) => (
                <KitchenCard
                  key={String(order.id)}
                  order={order}
                  tableName={tableNameById(order.tableId)}
                  skuById={(id) => skuByProductId.get(id) ?? ''}
                  isDelivering={activeTab === 'delivering'}
                  markReadyLoading={markReadyMutation.isPending}
                  markDeliveredLoading={markDeliveredMutation.isPending}
                  onMarkReady={() => setReadyTarget(order.id)}
                  onMarkDelivered={() => setDeliveredTarget(order.id)}
                  onNavigate={() => navigate({ to: '/orders/$id', params: { id: String(order.id) } })}
                />
              ))}
            </VStack>
          ))}
        </HStack>
      )}

      <ConfirmDialog
        open={readyTarget !== null}
        title="Tandai Siap?"
        description="Konfirmasi order ini sudah siap disajikan."
        confirmLabel="Tandai Siap"
        loading={markReadyMutation.isPending}
        onConfirm={() => readyTarget !== null && markReadyMutation.mutate(readyTarget)}
        onCancel={() => setReadyTarget(null)}
      />
      <ConfirmDialog
        open={deliveredTarget !== null}
        title="Tandai Terkirim?"
        description="Konfirmasi order ini sudah diantar ke meja."
        confirmLabel="Tandai Terkirim"
        loading={markDeliveredMutation.isPending}
        onConfirm={() => deliveredTarget !== null && markDeliveredMutation.mutate(deliveredTarget)}
        onCancel={() => setDeliveredTarget(null)}
      />
    </Box>
  )
}
