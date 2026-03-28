import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Dialog, Field, Flex, Heading, HStack, IconButton,
  Input, Portal, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { createListCollection, Select } from '@chakra-ui/react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { stockClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { useAuthStore } from '../../store/auth'
import { TransactionType } from '../../gen/wargapos/stock/v1/transaction_pb'
import type { Transaction } from '../../gen/wargapos/stock/v1/transaction_pb'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { SkuSelect } from '../../components/shared/SkuSelect'

const PAGE_SIZE = 20

type ItemRow = { skuId: number; quantity: string; price: string; rackId: string }
function emptyItem(): ItemRow { return { skuId: 0, quantity: '', price: '', rackId: '' } }

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

const typeOptions = createListCollection({
  items: [
    { label: 'All Types', value: '0' },
    { label: 'Stock In',  value: String(TransactionType.STOCK_IN) },
    { label: 'Stock Out', value: String(TransactionType.STOCK_OUT) },
    { label: 'Adjustment', value: String(TransactionType.ADJUSTMENT) },
    { label: 'Order',     value: String(TransactionType.ORDER) },
  ],
})

const createTypeOptions = createListCollection({
  items: [
    { label: 'Stock In',  value: String(TransactionType.STOCK_IN) },
    { label: 'Stock Out', value: String(TransactionType.STOCK_OUT) },
    { label: 'Adjustment', value: String(TransactionType.ADJUSTMENT) },
    { label: 'Order',     value: String(TransactionType.ORDER) },
  ],
})

function formatDate(ts?: Timestamp) {
  if (!ts) return '—'
  return new Date(Number(ts.seconds) * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatIDR(cents: bigint) {
  return (Number(cents) / 100).toLocaleString('id-ID')
}

export function TransactionsPage() {
  const { role } = useAuthStore()
  const isAdminOrManager = role === 'admin' || role === 'manager'
  const qc = useQueryClient()

  // List state
  const [page, setPage]             = useState(1)
  const [filterType, setFilterType] = useState('0')
  const [showCancelled, setShowCancelled] = useState(false)

  // Detail state
  const [selected, setSelected]   = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Create state
  const [createOpen, setCreateOpen] = useState(false)
  const [txType, setTxType]         = useState(String(TransactionType.STOCK_IN))
  const [note, setNote]             = useState('')
  const [items, setItems]           = useState<ItemRow[]>([emptyItem()])

  const isStockIn = Number(txType) === TransactionType.STOCK_IN

  function resetCreate() {
    setTxType(String(TransactionType.STOCK_IN))
    setNote('')
    setItems([emptyItem()])
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, i) => i === index ? { ...r, ...patch } : r))
  }
  function addItem() { setItems((prev) => [...prev, emptyItem()]) }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)) }

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, filterType, showCancelled],
    queryFn: () =>
      stockClient.listTransaction({
        page,
        pageSize: PAGE_SIZE,
        transactionType: Number(filterType) as TransactionType,
        cancelled: showCancelled,
      }),
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['transaction-detail', selected?.id],
    queryFn: () => stockClient.detailTransaction({ id: selected!.id }),
    enabled: !!selected,
  })

  const { data: skusData } = useQuery({
    queryKey: ['skus-select'],
    queryFn: () => stockClient.listSku({ page: 1, pageSize: 200, productId: 0, search: '' }),
  })
  const skuMap = new Map((skusData?.skus ?? []).map((s) => [s.id, s.code]))

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: (id: bigint) => stockClient.cancelTransaction({ transactionId: id, reason: '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction-detail', selected?.id] })
      toaster.create({ title: 'Transaction cancelled', type: 'success', duration: 3000 })
      setDetailOpen(false)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      // client-side validation
      if (items.length === 0) throw new Error('At least one item is required')
      for (const r of items) {
        if (!r.skuId) throw new Error('All items must have a SKU selected')
        if (!r.quantity || r.quantity === '0') throw new Error('Quantity must not be zero')
        if (isStockIn && (!r.price || r.price === '0')) throw new Error('Price is required for Stock In')
      }
      return stockClient.createTransaction({
        transactionType: Number(txType) as TransactionType,
        note,
        items: items.map((r) => ({
          skuId: r.skuId,
          quantity: Number(r.quantity || '0'),
          total:    Number(r.price   || '0'),
          rackId:   Number(r.rackId) || 0,
        })),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setCreateOpen(false)
      resetCreate()
      toaster.create({ title: 'Transaction created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const transactions = data?.transactions ?? []
  const total        = data?.total ?? 0
  const totalPages   = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const detail       = detailData?.transaction

  function openDetail(tx: Transaction) {
    setSelected(tx)
    setDetailOpen(true)
  }

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={4} justify="space-between" wrap="wrap" gap={3}>
        <HStack gap={2}>
          <ArrowLeftRight size={20} />
          <Heading size="md">Transactions</Heading>
        </HStack>

        <HStack gap={2} wrap="wrap">
          {/* Type filter */}
          <Select.Root
            collection={typeOptions}
            value={[filterType]}
            onValueChange={({ value }) => { setFilterType(value[0]); setPage(1) }}
            size="sm"
            minW="140px"
          >
            <Select.Trigger><Select.ValueText /></Select.Trigger>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {typeOptions.items.map((item) => (
                    <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>

          {/* Cancelled toggle */}
          <Button
            size="sm"
            variant={showCancelled ? 'solid' : 'outline'}
            colorPalette={showCancelled ? 'red' : 'gray'}
            onClick={() => { setShowCancelled((v) => !v); setPage(1) }}
          >
            Cancelled
          </Button>

          {isAdminOrManager && (
            <Button colorPalette="blue" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Add Transaction
            </Button>
          )}
        </HStack>
      </HStack>

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : (
        <Table.Root variant="outline" size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>#</Table.ColumnHeader>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader>Cancelled</Table.ColumnHeader>
              <Table.ColumnHeader>Note</Table.ColumnHeader>
              <Table.ColumnHeader>Date</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {transactions.map((tx) => (
              <Table.Row key={String(tx.id)} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openDetail(tx)}>
                <Table.Cell fontFamily="mono" fontSize="xs">#{String(tx.id)}</Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={TYPE_COLORS[tx.transactionType] ?? 'gray'} size="sm">
                    {TYPE_LABELS[tx.transactionType] ?? 'Unknown'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {tx.cancelled && <Badge colorPalette="red" variant="outline" size="sm">Cancelled</Badge>}
                </Table.Cell>
                <Table.Cell fontSize="xs" color="gray.600" maxW="200px" overflow="hidden" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {tx.note || '—'}
                </Table.Cell>
                <Table.Cell fontSize="xs" color="gray.500">{formatDate(tx.createdAt)}</Table.Cell>
              </Table.Row>
            ))}
            {transactions.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No transactions found.</Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      )}

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <HStack justify="center" mt={4} gap={3}>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <Text fontSize="sm" color="gray.600">{page} / {totalPages}</Text>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={16} />
          </Button>
        </HStack>
      )}

      {/* ── Create Transaction Dialog ─────────────────────────── */}
      <Dialog.Root
        open={createOpen}
        onOpenChange={({ open }) => { if (!open) { setCreateOpen(false); resetCreate() } }}
        size="lg"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Add Transaction</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {/* Transaction type */}
                  <Field.Root>
                    <Field.Label fontSize="sm">Type</Field.Label>
                    <Select.Root
                      collection={createTypeOptions}
                      value={[txType]}
                      onValueChange={({ value }) => setTxType(value[0])}
                      size="sm"
                    >
                      <Select.Trigger><Select.ValueText /></Select.Trigger>
                      <Portal>
                        <Select.Positioner>
                          <Select.Content>
                            {createTypeOptions.items.map((item) => (
                              <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  </Field.Root>

                  {/* Note */}
                  <Field.Root>
                    <Field.Label fontSize="sm">Note <Field.RequiredIndicator /></Field.Label>
                    <Input
                      size="sm"
                      placeholder="Optional note…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </Field.Root>

                  {/* Items */}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>Items</Text>
                    <VStack gap={3} align="stretch">
                      {items.map((row, i) => (
                        <Box
                          key={i}
                          p={3} border="1px solid" borderColor="gray.200" borderRadius="md"
                        >
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="xs" color="gray.500" fontWeight="medium">Item {i + 1}</Text>
                            {items.length > 1 && (
                              <IconButton
                                aria-label="Remove item"
                                size="xs"
                                variant="ghost"
                                colorPalette="red"
                                onClick={() => removeItem(i)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            )}
                          </HStack>

                          <VStack gap={2} align="stretch">
                            <Field.Root>
                              <Field.Label fontSize="xs">SKU</Field.Label>
                              <SkuSelect
                                value={row.skuId}
                                onChange={(id) => updateItem(i, { skuId: id })}
                                size="sm"
                                minW="full"
                              />
                            </Field.Root>

                            <HStack gap={2}>
                              <Field.Root flex={1}>
                                <Field.Label fontSize="xs">Quantity</Field.Label>
                                <Input
                                  size="sm"
                                  type="number"
                                  placeholder={isStockIn ? 'e.g. 10' : 'e.g. -5'}
                                  value={row.quantity}
                                  onChange={(e) => updateItem(i, { quantity: e.target.value })}
                                />
                              </Field.Root>

                              {isStockIn && (
                                <Field.Root flex={1}>
                                  <Field.Label fontSize="xs">Price (IDR, cents)</Field.Label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    placeholder="e.g. 500000"
                                    value={row.price}
                                    onChange={(e) => updateItem(i, { price: e.target.value })}
                                  />
                                </Field.Root>
                              )}

                              <Field.Root flex={1}>
                                <Field.Label fontSize="xs">Rack ID (opt.)</Field.Label>
                                <Input
                                  size="sm"
                                  type="number"
                                  placeholder="0"
                                  value={row.rackId}
                                  onChange={(e) => updateItem(i, { rackId: e.target.value })}
                                />
                              </Field.Root>
                            </HStack>
                          </VStack>
                        </Box>
                      ))}
                    </VStack>

                    <Button size="sm" variant="outline" mt={2} onClick={addItem} w="full">
                      <Plus size={14} /> Add Item
                    </Button>
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="blue"
                  size="sm"
                  loading={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* ── Detail Dialog ─────────────────────────────────────── */}
      <Dialog.Root open={detailOpen} onOpenChange={({ open }) => setDetailOpen(open)} size="lg">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  {selected && (
                    <HStack gap={2}>
                      <Text>Transaction #{String(selected.id)}</Text>
                      <Badge colorPalette={TYPE_COLORS[selected.transactionType] ?? 'gray'} size="sm">
                        {TYPE_LABELS[selected.transactionType] ?? 'Unknown'}
                      </Badge>
                      {selected.cancelled && <Badge colorPalette="red" variant="outline" size="sm">Cancelled</Badge>}
                    </HStack>
                  )}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {detailLoading ? (
                  <Flex justify="center" py={8}><Spinner /></Flex>
                ) : detail ? (
                  <VStack align="stretch" gap={4}>
                    <HStack gap={6} wrap="wrap">
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={0.5}>Date</Text>
                        <Text fontSize="sm">{formatDate(detail.createdAt)}</Text>
                      </Box>
                      {detail.note && (
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={0.5}>Note</Text>
                          <Text fontSize="sm">{detail.note}</Text>
                        </Box>
                      )}
                    </HStack>

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
                  </VStack>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                {isAdminOrManager && detail && !detail.cancelled && (
                  <Button
                    colorPalette="red" variant="outline" size="sm"
                    loading={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(detail.id)}
                    mr="auto"
                  >
                    Cancel Transaction
                  </Button>
                )}
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">Close</Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
