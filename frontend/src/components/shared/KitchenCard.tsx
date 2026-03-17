import { Box, Button, Flex, HStack, Text, VStack, Badge } from '@chakra-ui/react'
import { ChefHat } from 'lucide-react'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import type { Order } from '../../gen/wargapos/transaction/v1/transaction_pb'

interface KitchenCardProps {
  order: Order
  tableName: string
  markReadyLoading: boolean
  onMarkReady: () => void
  onNavigate: () => void
}

function elapsedLabel(createdAt: Timestamp | undefined): { label: string; color: string; mins: number } {
  const secs = Math.floor(Date.now() / 1000) - Number(createdAt?.seconds ?? 0n)
  const mins = Math.floor(secs / 60)
  const label = mins < 1 ? 'Just now' : `${mins} min ago`
  const color = mins >= 20 ? 'red.500' : mins >= 10 ? 'orange.500' : 'gray.500'
  return { label, color, mins }
}

export function KitchenCard({ order, tableName, markReadyLoading, onMarkReady, onNavigate }: KitchenCardProps) {
  const { label: elapsed, color: elapsedColor, mins } = elapsedLabel(order.createdAt)
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
      gap={3}
      cursor="pointer"
      _hover={{ boxShadow: 'lg' }}
      overflow="hidden"
      onClick={onNavigate}
    >
      <Box p={4} display="flex" flexDir="column" gap={3} flex={1}>
        {/* Order header */}
        <Flex justify="space-between" align="start">
          <Box>
            <Text fontWeight="bold" fontSize="xl">#{String(order.id)}</Text>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">{tableName}</Text>
            {order.customerName && (
              <Text fontSize="xs" color="gray.400">{order.customerName}</Text>
            )}
          </Box>
          <Text fontSize="sm" color={elapsedColor} fontWeight="medium">{elapsed}</Text>
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
      </Box>

      {/* Mark Prepared button */}
      <Box px={4} pb={4} onClick={(e) => e.stopPropagation()}>
        <Button
          colorPalette="blue"
          size="sm"
          w="full"
          loading={markReadyLoading}
          onClick={onMarkReady}
        >
          <ChefHat size={16} />
          Mark Prepared
        </Button>
      </Box>
    </Box>
  )
}
