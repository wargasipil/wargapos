import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Plus } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { MarketplaceOrderStatus } from '../../../gen/wargapos/marketplace/v1/order_pb'
import { formatPrice, formatDateTime } from '../../../lib/format'

const STATUS_TABS = [
  { label: 'All',       value: MarketplaceOrderStatus.UNSPECIFIED },
  { label: 'Pending',   value: MarketplaceOrderStatus.PENDING },
  { label: 'Cancelled', value: MarketplaceOrderStatus.CANCELLED },
]

function statusBadge(status: MarketplaceOrderStatus) {
  if (status === MarketplaceOrderStatus.PENDING)   return <Badge colorPalette="yellow">Pending</Badge>
  if (status === MarketplaceOrderStatus.CANCELLED) return <Badge colorPalette="red">Cancelled</Badge>
  return <Badge colorPalette="gray">Unknown</Badge>
}

export function MarketplaceOrdersPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<MarketplaceOrderStatus>(MarketplaceOrderStatus.UNSPECIFIED)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-orders', statusFilter, page],
    queryFn: () => marketplaceClient.listOrders({ page, pageSize: 20, statusFilter }),
    staleTime: 0,
  })

  const orders = data?.orders ?? []
  const total = data?.total ?? 0

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={5} gap={3} flexWrap="wrap">
        <Heading size="md">Marketplace Orders</Heading>
        <Button asChild colorPalette="blue" size="sm">
          <Link to="/marketplace/orders/new"><Plus size={16} /> Create Order</Link>
        </Button>
      </Flex>

      {/* Status tabs */}
      <Tabs.Root
        value={String(statusFilter)}
        onValueChange={(d) => { setStatusFilter(Number(d.value) as MarketplaceOrderStatus); setPage(1) }}
        mb={4}
        size="sm"
      >
        <Tabs.List>
          {STATUS_TABS.map((t) => (
            <Tabs.Trigger key={t.value} value={String(t.value)}>{t.label}</Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : orders.length === 0 ? (
        <Flex justify="center" py={16}><Text color="gray.400">No orders found</Text></Flex>
      ) : (
        <>
          {/* Desktop table */}
          <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>#</Table.ColumnHeader>
                  <Table.ColumnHeader>Shop</Table.ColumnHeader>
                  <Table.ColumnHeader>Customer</Table.ColumnHeader>
                  <Table.ColumnHeader>Phone</Table.ColumnHeader>
                  <Table.ColumnHeader>Total</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {orders.map((o) => (
                  <Table.Row
                    key={String(o.id)}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => navigate({ to: '/marketplace/orders/$id', params: { id: String(o.id) } })}
                  >
                    <Table.Cell color="gray.500" fontSize="xs">#{String(o.id)}</Table.Cell>
                    <Table.Cell color="gray.600" fontSize="sm">{o.shopName || '—'}</Table.Cell>
                    <Table.Cell fontWeight="medium">{o.customerName || '—'}</Table.Cell>
                    <Table.Cell color="gray.500">{o.phoneNumber || '—'}</Table.Cell>
                    <Table.Cell>{formatPrice(BigInt(o.totalCents))}</Table.Cell>
                    <Table.Cell>{statusBadge(o.status)}</Table.Cell>
                    <Table.Cell color="gray.500" fontSize="xs">{formatDateTime(o.createdAt)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {/* Mobile cards */}
          <VStack display={{ base: 'flex', md: 'none' }} gap={3} align="stretch">
            {orders.map((o) => (
              <Box
                key={String(o.id)}
                bg="white"
                borderRadius="lg"
                p={4}
                boxShadow="sm"
                cursor="pointer"
                onClick={() => navigate({ to: '/marketplace/orders/$id', params: { id: String(o.id) } })}
              >
                <Flex justify="space-between" align="flex-start" mb={1}>
                  <Text fontWeight="semibold" fontSize="sm">{o.customerName || 'No name'}</Text>
                  {statusBadge(o.status)}
                </Flex>
                {o.shopName && (
                  <Text fontSize="xs" color="blue.500" mb={1}>{o.shopName}</Text>
                )}
                <Text fontSize="xs" color="gray.500" mb={2}>{o.phoneNumber || '—'}</Text>
                <Flex justify="space-between" fontSize="sm">
                  <Text fontWeight="medium" color="blue.600">{formatPrice(BigInt(o.totalCents))}</Text>
                  <Text color="gray.400" fontSize="xs">{formatDateTime(o.createdAt)}</Text>
                </Flex>
              </Box>
            ))}
          </VStack>

          {/* Pagination */}
          {total > 20 && (
            <HStack mt={4} justify="center" gap={3}>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Text fontSize="sm" color="gray.500">Page {page}</Text>
              <Button size="sm" variant="outline" disabled={orders.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </HStack>
          )}
        </>
      )}
    </Box>
  )
}
