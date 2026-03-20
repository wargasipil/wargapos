import { useEffect, useState } from 'react'
import { Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { ChefHat, Truck } from 'lucide-react'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import type { Order } from '../../gen/wargapos/transaction/v1/order_pb'

interface KitchenCardProps {
  order: Order
  tableName: string
  skuById: (id: bigint) => string
  isDelivering?: boolean
  markReadyLoading: boolean
  markDeliveredLoading?: boolean
  onMarkReady: () => void
  onMarkDelivered?: () => void
  onNavigate: () => void
}

function elapsedLabel(createdAt: Timestamp | undefined): { label: string; color: string; bg: string; mins: number } {
  const secs = Math.floor(Date.now() / 1000) - Number(createdAt?.seconds ?? 0n)
  const mins = Math.floor(secs / 60)
  const label = mins < 1 ? 'Just now' : `${mins} min ago`
  const color = mins >= 20 ? 'red.600' : mins >= 10 ? 'orange.600' : 'gray.500'
  const bg = mins >= 20 ? 'red.50' : mins >= 10 ? 'orange.50' : 'gray.50'
  return { label, color, bg, mins }
}

export function KitchenCard({
  order, tableName, skuById, isDelivering,
  markReadyLoading, markDeliveredLoading,
  onMarkReady, onMarkDelivered, onNavigate,
}: KitchenCardProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const { label: elapsed, color: elapsedColor, bg: elapsedBg, mins } = elapsedLabel(order.createdAt)
  const borderColor = mins >= 20 ? 'red.400' : mins >= 10 ? 'orange.400' : 'gray.200'

  return (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="md"
      borderLeftWidth="4px"
      borderLeftColor={borderColor}
      display="flex"
      flexDir="column"
      cursor="pointer"
      _hover={{ boxShadow: 'lg' }}
      overflow="hidden"
      onClick={onNavigate}
    >
      <Box p={4} display="flex" flexDir="column" gap={2} flex={1}>
        {/* Header row */}
        <Flex justify="space-between" align="center">
          <HStack gap={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize="2xl">#{String(order.id)}</Text>
            <Badge colorPalette="gray" size="sm">{tableName}</Badge>
            <Badge colorPalette="blue" size="sm">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Badge>
          </HStack>
          <Text
            fontSize="xs"
            color={elapsedColor}
            fontWeight="semibold"
            bg={elapsedBg}
            px={2}
            py={0.5}
            borderRadius="md"
            flexShrink={0}
          >
            {elapsed}
          </Text>
        </Flex>

        {order.customerName && (
          <Text fontSize="xs" color="gray.400">{order.customerName}</Text>
        )}

        {/* Items */}
        <VStack align="stretch" gap={1} mt={1}>
          {order.items.map((item) => (
            <Box
              key={String(item.id)}
              borderBottom="1px solid"
              borderColor="gray.100"
              pb={1}
              _last={{ borderBottom: 'none', pb: 0 }}
            >
              <HStack justify="space-between" align="center">
                <Text fontSize="md" fontWeight="semibold">{item.productName}</Text>
                <Badge colorPalette="orange" fontSize="md" px={2} flexShrink={0}>×{item.quantity}</Badge>
              </HStack>
              {skuById(item.productId) && (
                <Text fontSize="xs" color="gray.400">{skuById(item.productId)}</Text>
              )}
              {item.notes && (
                <Box
                  bg="yellow.50"
                  borderLeft="3px solid"
                  borderColor="yellow.400"
                  px={2}
                  py={0.5}
                  mt={0.5}
                  borderRadius="sm"
                >
                  <Text fontSize="sm" color="yellow.800" fontWeight="medium">{item.notes}</Text>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Action button */}
      <Box px={4} pb={4} onClick={(e) => e.stopPropagation()}>
        {isDelivering ? (
          <Button
            colorPalette="purple"
            size="md"
            w="full"
            loading={markDeliveredLoading}
            onClick={onMarkDelivered}
          >
            <Truck size={18} />
            Mark Delivered
          </Button>
        ) : (
          <Button
            colorPalette="blue"
            size="md"
            w="full"
            loading={markReadyLoading}
            onClick={onMarkReady}
          >
            <ChefHat size={18} />
            Mark Prepared
          </Button>
        )}
      </Box>
    </Box>
  )
}
