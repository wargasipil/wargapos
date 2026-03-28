import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Dialog, Flex, Heading, HStack, Portal, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { stockClient } from '../../../client'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { formatDateTime } from '../../../lib/format'
import { useAuthStore } from '../../../store/auth'
import { TransactionType } from '../../../gen/wargapos/stock/v1/transaction_pb'
import type { Timestamp } from '@bufbuild/protobuf/wkt'

const TYPE_LABELS: Record<number, string> = {
  [TransactionType.STOCK_IN]:   'Stock In',
  [TransactionType.STOCK_OUT]:  'Stock Out',
  [TransactionType.ADJUSTMENT]: 'Adjustment',
  [TransactionType.ORDER]:      'Order',
}

const TYPE_COLORS: Record<number, string> = {
  [TransactionType.STOCK_IN]:   'green',
  [TransactionType.STOCK_OUT]:  'red',
  [TransactionType.ADJUSTMENT]: 'orange',
  [TransactionType.ORDER]:      'blue',
}

function formatIDR(cents: bigint) {
  return (Number(cents) / 100).toLocaleString('id-ID')
}

export function TransactionDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { role } = useAuthStore()
  const isAdminOrManager = role === 'admin' || role === 'manager'
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transaction-detail', id],
    queryFn: () => stockClient.detailTransaction({ id: BigInt(id) }),
  })

  const { data: skusData } = useQuery({
    queryKey: ['skus-select'],
    queryFn: () => stockClient.listSku({ page: 1, pageSize: 200, productId: 0, search: '' }),
  })
  const skuMap = new Map((skusData?.skus ?? []).map((s) => [s.id, s.code]))

  const cancelMutation = useMutation({
    mutationFn: () => stockClient.cancelTransaction({ transactionId: BigInt(id), reason: '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction-detail', id] })
      toaster.create({ title: 'Transaction cancelled', type: 'success', duration: 3000 })
      setConfirmOpen(false)
      window.history.back()
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  if (isLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (isError || !data?.transaction) return (
    <Flex justify="center" mt={16}>
      <Text color="gray.400">Transaction not found.</Text>
    </Flex>
  )

  const detail = data.transaction

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={4} gap={3}>
        <Box
          as="button"
          onClick={() => window.history.back()}
          display="flex"
          alignItems="center"
          color="gray.600"
          _hover={{ color: 'gray.900' }}
        >
          <ArrowLeft size={18} />
        </Box>
        <Heading size="md">Transaction #{id}</Heading>
        <Badge colorPalette={TYPE_COLORS[detail.transactionType] ?? 'gray'} size="sm">
          {TYPE_LABELS[detail.transactionType] ?? 'Unknown'}
        </Badge>
        {detail.cancelled && <Badge colorPalette="red" variant="outline" size="sm">Cancelled</Badge>}
      </HStack>

      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" mb={4} maxW="640px">
        <VStack align="stretch" gap={4}>
          {/* Meta */}
          <HStack gap={6} wrap="wrap">
            <Box>
              <Text fontSize="xs" color="gray.500" mb={0.5}>Date</Text>
              <Text fontSize="sm">{formatDateTime(detail.createdAt as Timestamp | undefined)}</Text>
            </Box>
            {detail.note && (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={0.5}>Note</Text>
                <Text fontSize="sm">{detail.note}</Text>
              </Box>
            )}
          </HStack>

          {/* Items table */}
          <Box overflowX="auto">
            <Box as="table" w="full" fontSize="sm">
              <Box as="thead">
                <Box as="tr" borderBottom="2px solid" borderColor="gray.200">
                  <Box as="th" textAlign="left" py={2} pr={4} color="gray.600" fontWeight="medium">SKU</Box>
                  <Box as="th" textAlign="right" py={2} pr={4} color="gray.600" fontWeight="medium">Qty</Box>
                  <Box as="th" textAlign="right" py={2} pr={4} color="gray.600" fontWeight="medium">Price (IDR)</Box>
                  <Box as="th" textAlign="right" py={2} color="gray.600" fontWeight="medium">Rack</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {detail.items.map((item, i) => (
                  <Box as="tr" key={i} borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" py={2} pr={4}>
                      <Text fontFamily="mono" fontSize="xs">{skuMap.get(item.skuId) ?? `#${item.skuId}`}</Text>
                    </Box>
                    <Box as="td" py={2} pr={4} textAlign="right">
                      {Number(item.quantity).toLocaleString('id-ID')}
                    </Box>
                    <Box as="td" py={2} pr={4} textAlign="right">
                      {formatIDR(BigInt(Math.round(item.total)))}
                    </Box>
                    <Box as="td" py={2} textAlign="right" color="gray.500">
                      {item.rackId || '—'}
                    </Box>
                  </Box>
                ))}
                {detail.items.length === 0 && (
                  <Box as="tr">
                    <Box as="td" py={4} textAlign="center" color="gray.400" {...{ colSpan: 4 }}>No items</Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Total */}
          <Flex justify="flex-end">
            <Text fontWeight="semibold" fontSize="sm">
              Total: Rp {formatIDR(BigInt(Math.round(detail.total)))}
            </Text>
          </Flex>
        </VStack>
      </Box>

      {isAdminOrManager && !detail.cancelled && (
        <Button
          colorPalette="red"
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          Cancel Transaction
        </Button>
      )}

      {/* Confirmation dialog */}
      <Dialog.Root open={confirmOpen} onOpenChange={({ open }) => setConfirmOpen(open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Cancel Transaction</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text fontSize="sm">
                  Are you sure you want to cancel transaction #{id}? This cannot be undone.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">Keep</Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="red"
                  size="sm"
                  loading={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  Cancel Transaction
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
