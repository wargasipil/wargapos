import { Badge, Box, Button, Flex, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { CheckCircle, ChevronRight, Truck, XCircle } from 'lucide-react'
import { OrderFrom, OrderStatus, PaymentStatus } from '../../gen/wargapos/transaction/v1/transaction_pb'
import type { Order } from '../../gen/wargapos/transaction/v1/transaction_pb'
import { formatPrice, formatTime, paymentMethodLabel, paymentMethodColor } from '../../lib/format'

interface OrderCardProps {
  order: Order
  tableName: string
  skuById?: (id: bigint) => string
  onNavigate: () => void
  onMarkDelivered: () => void
  onMarkPaid: () => void
  onCancel: () => void
  markDeliveredLoading: boolean
  markPaidLoading: boolean
  cancelLoading: boolean
}

const STATUS_BORDER: Record<number, string> = {
  [OrderStatus.PENDING]:   'orange.400',
  [OrderStatus.PREPARED]:  'blue.400',
  [OrderStatus.DELIVERED]: 'purple.400',
  [OrderStatus.CANCELLED]: 'gray.300',
}

function statusBadge(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:   return <Badge colorPalette="orange" size="sm">Pending</Badge>
    case OrderStatus.PREPARED:  return <Badge colorPalette="blue"   size="sm">Prepared</Badge>
    case OrderStatus.DELIVERED: return <Badge colorPalette="purple" size="sm">Delivered</Badge>
    case OrderStatus.CANCELLED: return <Badge colorPalette="red"    size="sm">Cancelled</Badge>
    default: return null
  }
}

function paymentBadge(ps: PaymentStatus) {
  switch (ps) {
    case PaymentStatus.PAID:     return <Badge colorPalette="green"  size="sm">Paid</Badge>
    case PaymentStatus.REFUNDED: return <Badge colorPalette="gray"   size="sm">Refunded</Badge>
    default:                     return <Badge colorPalette="orange" size="sm">Unpaid</Badge>
  }
}

const isActive = (status: OrderStatus) =>
  status === OrderStatus.PENDING ||
  status === OrderStatus.PREPARED ||
  status === OrderStatus.DELIVERED

export function OrderCard({
  order,
  tableName,
  skuById,
  onNavigate,
  onMarkDelivered,
  onMarkPaid,
  onCancel,
  markDeliveredLoading,
  markPaidLoading,
  cancelLoading,
}: OrderCardProps) {
  const borderColor = STATUS_BORDER[order.status as number] ?? 'gray.200'
  const mobileTeaserNames = order.items
    .slice(0, 2)
    .map((i) => i.productName)
    .join(', ') + (order.items.length > 2 ? '...' : '')

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
      borderLeftWidth="4px"
      borderLeftColor={borderColor}
      cursor="pointer"
      _hover={{ boxShadow: 'md' }}
      overflow="hidden"
      onClick={onNavigate}
    >
      <Box p={4}>
        {/* Header row: ID + badges + time */}
        <Flex justify="space-between" align="center" mb={1}>
          <HStack gap={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize="sm">#{String(order.id)}</Text>
            {statusBadge(order.status)}
            {paymentBadge(order.paymentStatus)}
            <Badge colorPalette={paymentMethodColor(order.paymentMethod)} size="sm">
              {paymentMethodLabel(order.paymentMethod)}
            </Badge>
            {order.orderFrom === OrderFrom.GUEST && (
              <Badge colorPalette="teal" size="sm">Guest</Badge>
            )}
            {order.orderFrom === OrderFrom.POS && (
              <Badge colorPalette="blue" size="sm">POS</Badge>
            )}
          </HStack>
          <HStack gap={1} flexShrink={0}>
            <Text fontSize="xs" color="gray.400">{formatTime(order.createdAt)}</Text>
            <ChevronRight size={14} color="gray" />
          </HStack>
        </Flex>

        {/* Meta row: table · customer · total */}
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="xs" color="gray.500">
              {tableName}
              {order.customerName ? ` · ${order.customerName}` : ''}
              {' · '}{order.items.length} item(s)
            </Text>
            {/* Mobile: item name teaser */}
            {order.items.length > 0 && (
              <Text
                display={{ base: 'block', md: 'none' }}
                fontSize="xs"
                color="gray.400"
                truncate
                maxW="260px"
                mt={0.5}
              >
                {mobileTeaserNames}
              </Text>
            )}
          </Box>
          <Text fontWeight="bold" fontSize="sm" flexShrink={0}>
            {formatPrice(order.totalCents)}
          </Text>
        </Flex>

        {/* Desktop: full item list */}
        {order.items.length > 0 && (
          <Box display={{ base: 'none', md: 'block' }} mt={3}>
            <Separator mb={2} />
            <VStack align="stretch" gap={1}>
              {order.items.map((item, i) => (
                <Box key={i}>
                  <Text fontSize="xs">
                    {item.productName} <Text as="span" color="gray.400">×{item.quantity}</Text>
                    {' '}
                    <Text as="span" color="gray.400" fontSize="xs">{formatPrice(item.unitPriceCents)}</Text>
                  </Text>
                  {skuById?.(item.productId) && (
                    <Text fontSize="xs" color="gray.400" ml={0}>{skuById(item.productId)}</Text>
                  )}
                  {item.notes && (
                    <Text fontSize="xs" color="gray.400" fontStyle="italic" ml={2}>
                      ↳ {item.notes}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>
        )}
      </Box>

      {/* Action buttons */}
      {isActive(order.status) && (
        <Box
          px={4}
          py={2}
          borderTop="1px solid"
          borderColor="gray.100"
          bg="gray.50"
          onClick={(e) => e.stopPropagation()}
        >
          <HStack gap={2}>
            {order.status === OrderStatus.PREPARED && (
              <Button
                size="xs"
                colorPalette="purple"
                loading={markDeliveredLoading}
                onClick={onMarkDelivered}
              >
                <Truck size={11} />
                Mark Delivered
              </Button>
            )}
            {order.paymentStatus === PaymentStatus.UNPAID && order.status === OrderStatus.DELIVERED && (
              <Button
                size="xs"
                colorPalette="green"
                loading={markPaidLoading}
                onClick={onMarkPaid}
              >
                <CheckCircle size={11} />
                Mark as Paid
              </Button>
            )}
            <Button
              size="xs"
              variant="outline"
              colorPalette="red"
              loading={cancelLoading}
              onClick={onCancel}
            >
              <XCircle size={11} />
              Cancel
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  )
}
