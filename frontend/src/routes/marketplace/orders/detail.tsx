import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { useAuthStore } from '../../../store/auth'
import { MarketplaceOrderStatus } from '../../../gen/wargapos/marketplace/v1/order_pb'
import { formatPrice, formatDateTime } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'

function statusBadge(status: MarketplaceOrderStatus) {
  if (status === MarketplaceOrderStatus.PENDING)   return <Badge colorPalette="yellow">Pending</Badge>
  if (status === MarketplaceOrderStatus.CANCELLED) return <Badge colorPalette="red">Cancelled</Badge>
  return <Badge colorPalette="gray">Unknown</Badge>
}

export function MarketplaceOrderDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const isAdminOrManager = role === 'admin' || role === 'manager'

  const [cancelOpen, setCancelOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-order', id],
    queryFn: () => marketplaceClient.getOrder({ id: BigInt(id) }),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.updateOrderStatus({
        id: BigInt(id),
        status: MarketplaceOrderStatus.CANCELLED,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-order', id] })
      qc.invalidateQueries({ queryKey: ['marketplace-orders'] })
      toaster.create({ title: 'Order cancelled', type: 'info', duration: 2000 })
      setCancelOpen(false)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  if (isLoading) return <Flex justify="center" py={16}><Spinner /></Flex>

  const order = data?.order
  if (!order) return <Flex justify="center" py={16}><Text color="gray.400">Order not found</Text></Flex>

  const isCancelled = order.status === MarketplaceOrderStatus.CANCELLED

  return (
    <Box p={{ base: 3, md: 6 }} maxW="640px">
      {/* Header */}
      <HStack gap={3} mb={5}>
        <Button asChild variant="ghost" size="sm" px={2}>
          <Link to="/marketplace/orders"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md">Order #{id}</Heading>
        {statusBadge(order.status)}
      </HStack>

      {/* Customer info */}
      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" mb={4}>
        <Heading size="xs" color="gray.500" mb={3} textTransform="uppercase">Order Info</Heading>
        <VStack align="stretch" gap={2} fontSize="sm">
          <HStack justify="space-between">
            <Text color="gray.500">Shop</Text>
            <Text fontWeight="medium">{order.shopName || '—'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="gray.500">Customer</Text>
            <Text fontWeight="medium">{order.customerName || '—'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="gray.500">Phone</Text>
            <Text>{order.phoneNumber || '—'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="gray.500">Date</Text>
            <Text>{formatDateTime(order.createdAt)}</Text>
          </HStack>
        </VStack>
      </Box>

      {/* Order items */}
      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" mb={4}>
        <Heading size="xs" color="gray.500" mb={3} textTransform="uppercase">Items</Heading>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Item</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Qty</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Unit Price</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Subtotal</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {order.items.map((item) => (
              <Table.Row key={String(item.id)}>
                <Table.Cell>{item.itemName}</Table.Cell>
                <Table.Cell textAlign="center">{item.quantity}</Table.Cell>
                <Table.Cell textAlign="right">{formatPrice(BigInt(item.unitPriceCents))}</Table.Cell>
                <Table.Cell textAlign="right" fontWeight="medium">{formatPrice(BigInt(item.subtotalCents))}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <Flex justify="flex-end" mt={3} pt={3} borderTop="1px solid" borderColor="gray.100">
          <HStack gap={6}>
            <Text fontSize="sm" color="gray.500">Total</Text>
            <Text fontWeight="bold" color="blue.600">{formatPrice(BigInt(order.totalCents))}</Text>
          </HStack>
        </Flex>
      </Box>

      {/* Actions */}
      {isAdminOrManager && !isCancelled && (
        <Flex justify="flex-end">
          <Button colorPalette="red" variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
            Cancel Order
          </Button>
        </Flex>
      )}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Order"
        description={`Cancel order #${id}? This cannot be undone.`}
        confirmLabel="Cancel Order"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelOpen(false)}
      />
    </Box>
  )
}
