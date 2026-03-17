import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Grid, Heading, HStack, Spinner, Text,
} from '@chakra-ui/react'
import { ChefHat, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { transactionClient, tableClient } from '../client'
import { OrderStatus } from '../gen/wargapos/transaction/v1/transaction_pb'
import { toaster } from '../components/ui/toaster'
import { stripError } from '../lib/errors'
import { KitchenCard } from '../components/shared/KitchenCard'

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

export function KitchenPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => transactionClient.listOrders({ statusFilter: OrderStatus.PENDING, pageSize: 50, page: 1 }),
    refetchInterval: 5_000,
    staleTime: 0,
  })

  const prevCount = useRef<number | null>(null)
  useEffect(() => {
    const count = data?.orders.length ?? 0
    if (prevCount.current !== null && count > prevCount.current) {
      beep()
    }
    prevCount.current = count
  }, [data?.orders.length])

  // Sync fullscreen icon with Esc key / external fullscreen changes
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  const markReadyMutation = useMutation({
    mutationFn: (orderId: bigint) => transactionClient.markOrderReady({ orderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['orders-ready-count'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toaster.create({ title: 'Order marked as ready', type: 'success', duration: 2000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const orders = data?.orders ?? []
  const tables = tablesData?.tables ?? []

  function tableNameById(id: bigint): string {
    if (id === 0n) return 'Walk-in'
    return tables.find((t) => t.id === id)?.name ?? `#${String(id)}`
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

  return (
    <Box p={{ base: 3, md: 6 }} minH="100%">
      {/* Header */}
      <Flex align="center" justify="space-between" mb={6} wrap="wrap" gap={2}>
        <HStack gap={3}>
          <ChefHat size={28} color="#f97316" />
          <Heading size="lg">Kitchen Display</Heading>
          <Badge colorPalette="orange" fontSize="sm">{orders.length} pending</Badge>
        </HStack>
        <HStack gap={2} color="gray.400" fontSize="xs">
          <RefreshCw size={12} />
          <Text>Updated {updatedTime} · auto-refreshes every 5s</Text>
          <Button size="xs" variant="ghost" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </Button>
        </HStack>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={16}><Spinner size="lg" /></Flex>
      ) : orders.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py={20} gap={3} color="gray.400">
          <ChefHat size={48} />
          <Text fontSize="lg" fontWeight="medium">All clear — no pending orders</Text>
        </Flex>
      ) : (
        <Grid
          templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          gap={4}
        >
          {orders.map((order) => (
            <KitchenCard
              key={String(order.id)}
              order={order}
              tableName={tableNameById(order.tableId)}
              markReadyLoading={markReadyMutation.isPending}
              onMarkReady={() => markReadyMutation.mutate(order.id)}
              onNavigate={() => navigate({ to: '/orders/$id', params: { id: String(order.id) } })}
            />
          ))}
        </Grid>
      )}
    </Box>
  )
}
