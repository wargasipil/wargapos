import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { marketplaceClient, marketplaceOrderClient } from '../../../client'
import { MarketplaceShopType } from '../../../gen/wargapos/marketplace/v1/shop_pb'
import { MarketplaceOrderStatus } from '../../../gen/wargapos/marketplace/v1/order_pb'
import { formatPrice, formatDateTime } from '../../../lib/format'

const SHOP_TYPE_LABELS: Record<number, string> = {
  [MarketplaceShopType.SHOPEE]: 'Shopee',
  [MarketplaceShopType.TOKOPEDIA]: 'Tokopedia',
  [MarketplaceShopType.LAZADA]: 'Lazada',
  [MarketplaceShopType.OTHER]: 'Other',
}

const SHOP_TYPE_COLORS: Record<number, string> = {
  [MarketplaceShopType.SHOPEE]: 'orange',
  [MarketplaceShopType.TOKOPEDIA]: 'green',
  [MarketplaceShopType.LAZADA]: 'blue',
  [MarketplaceShopType.OTHER]: 'gray',
}

function orderStatusBadge(status: MarketplaceOrderStatus) {
  if (status === MarketplaceOrderStatus.PENDING)   return <Badge colorPalette="yellow" size="sm">Pending</Badge>
  if (status === MarketplaceOrderStatus.COMPLETED) return <Badge colorPalette="green" size="sm">Completed</Badge>
  if (status === MarketplaceOrderStatus.CANCELLED) return <Badge colorPalette="red" size="sm">Cancelled</Badge>
  return <Badge colorPalette="gray" size="sm">Unknown</Badge>
}

export function ShopDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()

  const { data: shopData, isLoading: shopLoading } = useQuery({
    queryKey: ['marketplace-shop', id],
    queryFn: () => marketplaceClient.getShop({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['marketplace-orders', 'shop', id],
    queryFn: () => marketplaceOrderClient.listOrders({
      shopId: BigInt(id),
      page: 1,
      pageSize: 10,
      statusFilter: MarketplaceOrderStatus.UNSPECIFIED,
    }),
    enabled: !!id,
    staleTime: 0,
  })

  if (shopLoading) return <Flex justify="center" py={16}><Spinner /></Flex>

  const shop = shopData?.shop
  if (!shop) return <Flex justify="center" py={16}><Text color="gray.400">Shop not found</Text></Flex>

  const orders = ordersData?.orders ?? []
  const orderTotal = ordersData?.total ?? 0

  return (
    <Box p={{ base: 3, md: 6 }}>
      {/* Header */}
      <HStack gap={3} mb={5}>
        <Button asChild variant="ghost" size="sm" px={2}>
          <Link to="/marketplace/shop"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md">{shop.name}</Heading>
        <Badge colorPalette={SHOP_TYPE_COLORS[shop.type] ?? 'gray'}>
          {SHOP_TYPE_LABELS[shop.type] ?? 'Unknown'}
        </Badge>
        <Badge colorPalette={shop.isActive ? 'green' : 'gray'}>
          {shop.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Button asChild size="sm" variant="outline" ml="auto">
          <Link to="/marketplace/shop/$id/edit" params={{ id }}><Pencil size={14} /> Edit</Link>
        </Button>
      </HStack>

      {/* Shop info card */}
      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" mb={4}>
        <Heading size="xs" color="gray.500" mb={3} textTransform="uppercase">Shop Info</Heading>
        <VStack align="stretch" gap={2} fontSize="sm">
          <HStack justify="space-between">
            <Text color="gray.500">Username</Text>
            <Text fontWeight="medium">{shop.username || '—'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="gray.500">URL</Text>
            {shop.url ? (
              <a
                href={shop.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--chakra-colors-blue-500)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {shop.url} <ExternalLink size={12} />
              </a>
            ) : (
              <Text color="gray.300">—</Text>
            )}
          </HStack>
          <HStack justify="space-between">
            <Text color="gray.500">Created</Text>
            <Text>{formatDateTime(shop.createdAt)}</Text>
          </HStack>
        </VStack>
      </Box>

      {/* Recent orders card */}
      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="xs" color="gray.500" textTransform="uppercase">
            Orders {ordersLoading ? '' : `(${orderTotal})`}
          </Heading>
          <Button asChild size="xs" variant="ghost" colorPalette="blue">
            <Link to="/marketplace/orders" search={{ shopId: id } as never}>View all</Link>
          </Button>
        </Flex>

        {ordersLoading ? (
          <Flex justify="center" py={6}><Spinner size="sm" /></Flex>
        ) : orders.length === 0 ? (
          <Flex justify="center" py={6}><Text color="gray.400" fontSize="sm">No orders yet</Text></Flex>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>#</Table.ColumnHeader>
                <Table.ColumnHeader>Customer</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Total</Table.ColumnHeader>
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
                  <Table.Cell fontWeight="medium">{o.customerName || '—'}</Table.Cell>
                  <Table.Cell textAlign="right">{formatPrice(BigInt(o.totalCents))}</Table.Cell>
                  <Table.Cell>{orderStatusBadge(o.status)}</Table.Cell>
                  <Table.Cell color="gray.500" fontSize="xs">{formatDateTime(o.createdAt)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Box>
  )
}
