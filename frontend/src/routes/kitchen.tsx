import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Flex, Grid, Heading, HStack, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { ChefHat, RefreshCw } from 'lucide-react'
import { transactionClient, tableClient } from '../client'
import { OrderStatus } from '../gen/wargapos/transaction/v1/transaction_pb'
import { toaster } from '../components/ui/toaster'
import { stripError } from '../lib/errors'

function elapsedLabel(createdAt: bigint): { label: string; color: string } {
  const secs = Math.floor(Date.now() / 1000) - Number(createdAt)
  const mins = Math.floor(secs / 60)
  const label = mins < 1 ? 'Just now' : `${mins} min ago`
  const color = mins >= 20 ? 'red.500' : mins >= 10 ? 'orange.500' : 'gray.500'
  return { label, color }
}

export function KitchenPage() {
  const qc = useQueryClient()

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => transactionClient.listOrders({ statusFilter: OrderStatus.PENDING, pageSize: 50, page: 1 }),
    refetchInterval: 10_000,
    staleTime: 0,
  })

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
          <Text>Updated {updatedTime} · auto-refreshes every 10s</Text>
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
          {orders.map((order) => {
            const { label: elapsed, color: elapsedColor } = elapsedLabel(order.createdAt)
            return (
              <Box
                key={String(order.id)}
                bg="white"
                borderRadius="xl"
                p={4}
                boxShadow="md"
                display="flex"
                flexDir="column"
                gap={3}
              >
                {/* Order header */}
                <Flex justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="bold" fontSize="xl">#{String(order.id)}</Text>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      {tableNameById(order.tableId)}
                    </Text>
                    {order.customerName && (
                      <Text fontSize="xs" color="gray.400">{order.customerName}</Text>
                    )}
                  </Box>
                  <Text fontSize="sm" color={elapsedColor} fontWeight="medium">
                    {elapsed}
                  </Text>
                </Flex>

                {/* Items */}
                <VStack align="stretch" gap={1} flex={1}>
                  {order.items.map((item) => (
                    <Box key={String(item.id)}>
                      <HStack justify="space-between">
                        <Text fontSize="md" fontWeight="medium">{item.productName}</Text>
                        <Badge colorPalette="orange" fontSize="md" px={2}>×{item.quantity}</Badge>
                      </HStack>
                      {item.notes && (
                        <Text fontSize="xs" color="orange.500" pl={2}>↳ {item.notes}</Text>
                      )}
                    </Box>
                  ))}
                </VStack>

                {/* Mark Ready button */}
                <Button
                  colorPalette="blue"
                  size="sm"
                  w="full"
                  loading={markReadyMutation.isPending}
                  onClick={() => markReadyMutation.mutate(order.id)}
                >
                  <ChefHat size={16} />
                  Mark Ready
                </Button>
              </Box>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}
