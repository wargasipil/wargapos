import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge, Box, Flex, Grid, Heading, HStack, Separator, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { ShoppingCart, TrendingUp, Package, Clock } from 'lucide-react'
import { transactionClient } from '../client'
import { DashboardPeriod, OrderStatus, PaymentMethod, PaymentStatus } from '../gen/wargapos/transaction/v1/transaction_pb'
import { useAuthStore } from '../store/auth'
import { formatPrice, formatTime, paymentMethodLabel } from '../lib/format'

const PERIODS = [
  { label: 'Today',      value: DashboardPeriod.TODAY },
  { label: 'This Week',  value: DashboardPeriod.THIS_WEEK },
  { label: 'This Month', value: DashboardPeriod.THIS_MONTH },
]

function statusBadge(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:   return <Badge colorPalette="orange" size="sm">Pending</Badge>
    case OrderStatus.PREPARED:  return <Badge colorPalette="blue"   size="sm">Prepared</Badge>
    case OrderStatus.DELIVERED: return <Badge colorPalette="purple" size="sm">Delivered</Badge>
    case OrderStatus.CANCELLED: return <Badge colorPalette="red"    size="sm">Cancelled</Badge>
    default: return null
  }
}

export function DashboardPage() {
  const { role } = useAuthStore()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<DashboardPeriod>(DashboardPeriod.TODAY)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => transactionClient.getDashboardStats({ period }),
    refetchInterval: 30_000,
    staleTime: 0,
  })

  const stats = data

  return (
    <Box p={{ base: 3, md: 6 }} maxW="900px">
      {/* Header */}
      <HStack gap={2} mb={1}>
        <ShoppingCart size={20} color="#3b82f6" />
        <Heading size="md">Dashboard</Heading>
        <Text color="gray.400" fontSize="sm">· {role}</Text>
      </HStack>

      {/* Period tabs */}
      <HStack gap={1} mt={4} mb={5}>
        {PERIODS.map((p) => (
          <Box
            key={p.value}
            px={3}
            py={1}
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            cursor="pointer"
            bg={period === p.value ? 'blue.500' : 'gray.100'}
            color={period === p.value ? 'white' : 'gray.600'}
            _hover={{ bg: period === p.value ? 'blue.600' : 'gray.200' }}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Box>
        ))}
      </HStack>

      {isLoading ? (
        <Flex justify="center" mt={16}><Spinner /></Flex>
      ) : (
        <VStack align="stretch" gap={5}>
          {/* Stat cards */}
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={3}>
            {/* Revenue */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" borderTop="3px solid" borderTopColor="green.400">
              <HStack gap={2} mb={1} color="gray.500">
                <TrendingUp size={14} />
                <Text fontSize="xs" fontWeight="medium">Revenue (Paid)</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="2xl">
                {formatPrice(BigInt(stats?.totalRevenueCents ?? 0))}
              </Text>
            </Box>

            {/* Total orders */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" borderTop="3px solid" borderTopColor="blue.400">
              <HStack gap={2} mb={1} color="gray.500">
                <ShoppingCart size={14} />
                <Text fontSize="xs" fontWeight="medium">Total Orders</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="2xl">{stats?.orderCounts?.total ?? 0}</Text>
              <HStack gap={2} mt={1} flexWrap="wrap">
                <Text fontSize="xs" color="orange.500">{stats?.orderCounts?.pending ?? 0} pending</Text>
                <Text fontSize="xs" color="purple.500">{stats?.orderCounts?.delivered ?? 0} delivered</Text>
                <Text fontSize="xs" color="red.400">{stats?.orderCounts?.cancelled ?? 0} cancelled</Text>
              </HStack>
            </Box>

            {/* Pending */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" borderTop="3px solid" borderTopColor="orange.400">
              <HStack gap={2} mb={1} color="gray.500">
                <Clock size={14} />
                <Text fontSize="xs" fontWeight="medium">Pending Now</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="2xl">{stats?.orderCounts?.pending ?? 0}</Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                {stats?.orderCounts?.prepared ?? 0} prepared
              </Text>
            </Box>
          </Grid>

          {/* Payment breakdown */}
          {stats?.paymentBreakdown && (
            <HStack gap={3} flexWrap="wrap">
              {[
                { method: PaymentMethod.CASH,            cents: stats.paymentBreakdown.cashCents },
                { method: PaymentMethod.MIDTRANS,        cents: stats.paymentBreakdown.midtransCents },
                { method: PaymentMethod.MANUAL_QRIS,     cents: stats.paymentBreakdown.manualQrisCents },
                { method: PaymentMethod.MANUAL_TRANSFER, cents: stats.paymentBreakdown.manualTransferCents },
              ].map(({ method, cents }) => (
                <Box key={method} bg="white" borderRadius="md" px={3} py={2} boxShadow="sm" minW="120px">
                  <Text fontSize="xs" color="gray.500">{paymentMethodLabel(method)}</Text>
                  <Text fontWeight="bold" fontSize="sm">{formatPrice(BigInt(cents))}</Text>
                </Box>
              ))}
            </HStack>
          )}

          {/* Bottom row: top products + recent orders */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            {/* Top products */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <HStack gap={2} mb={3}>
                <Package size={14} color="gray" />
                <Text fontWeight="semibold" fontSize="sm">Top Products</Text>
              </HStack>
              {(stats?.topProducts?.length ?? 0) === 0 ? (
                <Text fontSize="sm" color="gray.400">No data</Text>
              ) : (
                <VStack align="stretch" gap={2}>
                  {stats!.topProducts.map((p, i) => (
                    <Flex key={i} justify="space-between" align="center">
                      <HStack gap={2}>
                        <Text fontSize="xs" color="gray.400" w="16px">{i + 1}.</Text>
                        <Text fontSize="sm">{p.productName}</Text>
                      </HStack>
                      <HStack gap={3}>
                        <Text fontSize="xs" color="gray.500">×{p.quantitySold}</Text>
                        <Text fontSize="xs" fontWeight="medium">{formatPrice(BigInt(p.revenueCents))}</Text>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>

            {/* Recent orders */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <HStack gap={2} mb={3}>
                <Clock size={14} color="gray" />
                <Text fontWeight="semibold" fontSize="sm">Recent Orders</Text>
              </HStack>
              {(stats?.recentOrders?.length ?? 0) === 0 ? (
                <Text fontSize="sm" color="gray.400">No orders yet</Text>
              ) : (
                <VStack align="stretch" gap={0}>
                  {stats!.recentOrders.map((order, i) => (
                    <Box key={String(order.id)}>
                      {i > 0 && <Separator my={2} />}
                      <Flex
                        justify="space-between"
                        align="center"
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        borderRadius="md"
                        px={1}
                        py={0.5}
                        onClick={() => navigate({ to: '/orders/$id', params: { id: String(order.id) } })}
                      >
                        <HStack gap={2}>
                          <Text fontSize="sm" fontWeight="medium">#{String(order.id)}</Text>
                          {statusBadge(order.status)}
                          {order.paymentStatus === PaymentStatus.PAID && (
                            <Badge colorPalette="green" size="sm">Paid</Badge>
                          )}
                        </HStack>
                        <HStack gap={2}>
                          <Text fontSize="xs" color="gray.400">{formatTime(order.createdAt)}</Text>
                          <Text fontSize="sm" fontWeight="medium">{formatPrice(order.totalCents)}</Text>
                        </HStack>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>
          </Grid>
        </VStack>
      )}
    </Box>
  )
}
