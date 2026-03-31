import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { MarketplaceOrderStatus } from '../../../gen/wargapos/marketplace/v1/order_pb'
import { formatPrice, formatDateTime } from '../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'

function statusBadge(status: MarketplaceOrderStatus) {
  if (status === MarketplaceOrderStatus.PENDING)   return <Badge colorPalette="yellow" size="sm">Pending</Badge>
  if (status === MarketplaceOrderStatus.CANCELLED) return <Badge colorPalette="red" size="sm">Cancelled</Badge>
  return <Badge colorPalette="gray" size="sm">Unknown</Badge>
}

export function MarketplaceCustomerDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['marketplace-customer', id],
    queryFn: () => marketplaceClient.getCustomer({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['marketplace-orders-customer', id],
    queryFn: () => marketplaceClient.listOrders({ page: 1, pageSize: 100, customerId: BigInt(id) }),
    enabled: !!id,
  })

  if (customerLoading) return <Flex justify="center" mt={12}><Spinner /></Flex>

  const c = customerData?.customer
  if (!c) return <Text p={6} color="gray.400">Customer not found.</Text>

  const orders = ordersData?.orders ?? []

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={5} gap={3}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/customers"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md" flex={1}>{c.name}</Heading>
        <Button asChild size="sm" variant="outline">
          <Link to="/marketplace/customers/$id/edit" params={{ id }}>
            <Pencil size={14} /> Edit
          </Link>
        </Button>
      </HStack>

      <VStack gap={4} align="stretch">
        {/* Info card */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
          <VStack gap={2} align="stretch">
            <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
              <Text fontSize="sm" color="gray.500">Phone</Text>
              <Text fontSize="sm" fontWeight="medium">{c.phoneNumber || '—'}</Text>
            </Flex>
            <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
              <Text fontSize="sm" color="gray.500">Created</Text>
              <Text fontSize="sm" fontWeight="medium">{formatDateTime(c.createdAt as Timestamp | undefined)}</Text>
            </Flex>
            <Flex justify="space-between" pb={2}>
              <Text fontSize="sm" color="gray.500">Updated</Text>
              <Text fontSize="sm" fontWeight="medium">{formatDateTime(c.updatedAt as Timestamp | undefined)}</Text>
            </Flex>
          </VStack>
        </Box>

        {/* Order history */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
          <Text fontWeight="medium" fontSize="sm" mb={3}>Order History</Text>
          {ordersLoading ? (
            <Flex justify="center" py={6}><Spinner size="sm" /></Flex>
          ) : orders.length === 0 ? (
            <Text fontSize="sm" color="gray.400">No orders yet.</Text>
          ) : (
            <>
              {/* Desktop table */}
              <Box display={{ base: 'none', md: 'block' }}>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>#</Table.ColumnHeader>
                      <Table.ColumnHeader>Shop</Table.ColumnHeader>
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
                        <Table.Cell>{formatPrice(BigInt(o.totalCents))}</Table.Cell>
                        <Table.Cell>{statusBadge(o.status)}</Table.Cell>
                        <Table.Cell color="gray.500" fontSize="xs">{formatDateTime(o.createdAt)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Mobile cards */}
              <VStack display={{ base: 'flex', md: 'none' }} gap={2} align="stretch">
                {orders.map((o) => (
                  <Box
                    key={String(o.id)}
                    borderWidth={1}
                    borderColor="gray.100"
                    borderRadius="md"
                    p={3}
                    cursor="pointer"
                    onClick={() => navigate({ to: '/marketplace/orders/$id', params: { id: String(o.id) } })}
                  >
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" color="gray.500">#{String(o.id)}</Text>
                      {statusBadge(o.status)}
                    </Flex>
                    <Text fontSize="sm" fontWeight="medium">{formatPrice(BigInt(o.totalCents))}</Text>
                    <Text fontSize="xs" color="gray.400">{formatDateTime(o.createdAt)}</Text>
                  </Box>
                ))}
              </VStack>
            </>
          )}
        </Box>
      </VStack>
    </Box>
  )
}
