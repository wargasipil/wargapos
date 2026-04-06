import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Dialog, Field, Flex, Heading, HStack, IconButton,
  Input, Portal, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { createListCollection, Select } from '@chakra-ui/react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { stockClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { formatDateTime } from '../../lib/format'
import { useAuthStore } from '../../store/auth'
import { canManageStock } from '../../lib/roles'
import { TransactionType } from '../../gen/wargapos/stock/v1/transaction_pb'
import { SkuSelect } from '../../components/shared/SkuSelect'
import { WarehouseSelect } from '../../components/shared/WarehouseSelect'
import { RackSelect } from '../../components/shared/RackSelect'
import type { Timestamp } from '@bufbuild/protobuf/wkt'

const PAGE_SIZE = 20

type ItemRow = { skuId: number; quantity: string; price: string }
function emptyItem(): ItemRow { return { skuId: 0, quantity: '', price: '' } }

const TYPE_LABELS: Record<number, string> = {
  [TransactionType.STOCK_IN]:        'Stock In',
  [TransactionType.STOCK_OUT]:       'Stock Out',
  [TransactionType.PLACE_ADJUSTMENT]:'Placement',
  [TransactionType.PROBLEM]:         'Problem',
  [TransactionType.ORDER]:           'Order',
}

const TYPE_COLORS: Record<number, string> = {
  [TransactionType.STOCK_IN]:        'green',
  [TransactionType.STOCK_OUT]:       'red',
  [TransactionType.PLACE_ADJUSTMENT]:'blue',
  [TransactionType.PROBLEM]:         'orange',
  [TransactionType.ORDER]:           'purple',
}

const typeOptions = createListCollection({
  items: [
    { label: 'All Types',  value: '0' },
    { label: 'Stock In',   value: String(TransactionType.STOCK_IN) },
    { label: 'Stock Out',  value: String(TransactionType.STOCK_OUT) },
    { label: 'Placement',  value: String(TransactionType.PLACE_ADJUSTMENT) },
    { label: 'Problem',    value: String(TransactionType.PROBLEM) },
    { label: 'Order',      value: String(TransactionType.ORDER) },
  ],
})

const createTypeOptions = createListCollection({
  items: [
    { label: 'Stock In',  value: String(TransactionType.STOCK_IN) },
    { label: 'Stock Out', value: String(TransactionType.STOCK_OUT) },
    { label: 'Order',     value: String(TransactionType.ORDER) },
  ],
})

function ItemDetailPopup({ txId, onClose }: { txId: string; onClose: () => void }) {
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['transaction-detail', txId],
    queryFn: () => stockClient.detailTransaction({ id: BigInt(txId) }),
    enabled: !!txId,
  })

  const { data: skuData } = useQuery({
    queryKey: ['skus-all'],
    queryFn: () => stockClient.listSku({ page: 1, pageSize: 500 }),
  })

  const { data: warehouseData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => stockClient.listWarehouse({}),
  })

  const skuMap = new Map(skuData?.skus.map((s) => [s.id, s]) ?? [])
  const warehouseMap = new Map(warehouseData?.warehouses.map((w) => [w.id, w]) ?? [])

  const tx = detail?.transaction

  return (
    <Dialog.Root open onOpenChange={({ open }) => { if (!open) onClose() }} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                <HStack gap={2}>
                  <Text fontFamily="mono" fontSize="sm" color="gray.500">#{txId}</Text>
                  {tx && (
                    <Badge colorPalette={TYPE_COLORS[tx.transactionType] ?? 'gray'} size="sm">
                      {TYPE_LABELS[tx.transactionType] ?? 'Unknown'}
                    </Badge>
                  )}
                </HStack>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {detailLoading ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : !tx || tx.items.length === 0 ? (
                <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No items.</Text>
              ) : (
                <Table.Root variant="outline" size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>SKU</Table.ColumnHeader>
                      <Table.ColumnHeader>Warehouse</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Qty</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Total</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {tx.items.map((item, i) => {
                      const sku = skuMap.get(item.skuId)
                      const warehouse = sku ? warehouseMap.get(sku.warehouseId) : undefined
                      return (
                        <Table.Row key={i}>
                          <Table.Cell fontFamily="mono" fontSize="xs">{sku?.code ?? `SKU#${item.skuId}`}</Table.Cell>
                          <Table.Cell fontSize="xs" color="gray.600">{warehouse?.name ?? (sku ? `#${sku.warehouseId}` : '—')}</Table.Cell>
                          <Table.Cell textAlign="right" fontSize="xs">{item.quantity}</Table.Cell>
                          <Table.Cell textAlign="right" fontSize="xs">{'Rp\u00a0' + Math.round(item.total).toLocaleString('id-ID')}</Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export function TransactionsPage() {
  const { role } = useAuthStore()
  const isAdminOrManager = canManageStock(role)
  const qc = useQueryClient()
  const navigate = useNavigate()

  // List state from URL search params
  const search = useSearch({ strict: false }) as { page?: number; type?: string; cancelled?: boolean; dateFrom?: string; dateTo?: string }
  const page          = Number(search.page ?? 1)
  const filterType    = String(search.type ?? '0')
  const showCancelled = Boolean(search.cancelled ?? false)
  const dateFrom      = search.dateFrom ?? ''
  const dateTo        = search.dateTo ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateSearch(patch: Record<string, unknown>) {
    navigate({
      to: '/stock/transactions',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: { page: 1, type: filterType, cancelled: showCancelled, dateFrom, dateTo, ...patch } as any,
      replace: true,
    })
  }
  function goToPage(newPage: number) { updateSearch({ page: newPage }) }
  function changeType(newType: string) { updateSearch({ type: newType }) }
  function toggleCancelled() { updateSearch({ cancelled: !showCancelled }) }
  function changeDateFrom(v: string) { updateSearch({ dateFrom: v }) }
  function changeDateTo(v: string) { updateSearch({ dateTo: v }) }

  // Popup state
  const [popupTxId, setPopupTxId] = useState<string | null>(null)

  // Create state
  const [createOpen, setCreateOpen] = useState(false)
  const [txType, setTxType]         = useState(String(TransactionType.STOCK_IN))
  const [note, setNote]             = useState('')
  const [items, setItems]           = useState<ItemRow[]>([emptyItem()])
  const [warehouseId, setWarehouseId] = useState(0)
  const [rackId, setRackId]           = useState(0)

  const isStockIn = Number(txType) === TransactionType.STOCK_IN

  function resetCreate() {
    setTxType(String(TransactionType.STOCK_IN))
    setNote('')
    setItems([emptyItem()])
    setWarehouseId(0)
    setRackId(0)
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, i) => i === index ? { ...r, ...patch } : r))
  }
  function addItem() { setItems((prev) => [...prev, emptyItem()]) }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)) }

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, filterType, showCancelled, dateFrom, dateTo],
    queryFn: () =>
      stockClient.listTransaction({
        page,
        pageSize: PAGE_SIZE,
        transactionType: Number(filterType) as TransactionType,
        cancelled: showCancelled,
        dateFrom,
        dateTo,
      }),
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
      if (isStockIn && !rackId) throw new Error('Rack is required for Stock In')
      return stockClient.createTransaction({
        kind: {
          case: 'stockIn',
          value: {
            placement: items.map((r) => ({
              rackId,
              skuId: r.skuId,
              count: Number(r.quantity || '0'),
            })),
            items: items.map((r) => ({
              skuId: r.skuId,
              quantity: Number(r.quantity || '0'),
              total:    Number(r.price   || '0'),
            })),
          },
        },
        note,
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
            onValueChange={({ value }) => changeType(value[0])}
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
            onClick={toggleCancelled}
          >
            Cancelled
          </Button>

          {/* Date range */}
          <Input
            size="sm"
            type="date"
            value={dateFrom}
            onChange={(e) => changeDateFrom(e.target.value)}
            maxW="150px"
            placeholder="From"
          />
          <Input
            size="sm"
            type="date"
            value={dateTo}
            onChange={(e) => changeDateTo(e.target.value)}
            maxW="150px"
            placeholder="To"
          />

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
              <Table.ColumnHeader w="1px">Cancelled</Table.ColumnHeader>
              <Table.ColumnHeader>Note</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Total</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Products</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Pieces</Table.ColumnHeader>
              <Table.ColumnHeader>Date</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {transactions.map((tx) => (
              <Table.Row
                key={String(tx.id)}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => navigate({ to: '/stock/transactions/$id', params: { id: String(tx.id) } } as any)}
              >
                <Table.Cell fontFamily="mono" fontSize="xs">#{String(tx.id)}</Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={TYPE_COLORS[tx.transactionType] ?? 'gray'} size="sm">
                    {TYPE_LABELS[tx.transactionType] ?? 'Unknown'}
                  </Badge>
                </Table.Cell>
                <Table.Cell w="1px" whiteSpace="nowrap">
                  {tx.cancelled && <Badge colorPalette="red" variant="outline" size="sm">Cancelled</Badge>}
                </Table.Cell>
                <Table.Cell fontSize="xs" color="gray.600" maxW="160px" overflow="hidden" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {tx.note || '—'}
                </Table.Cell>
                <Table.Cell textAlign="right" fontSize="xs" fontFamily="mono">
                  {'Rp\u00a0' + Math.round(tx.total).toLocaleString('id-ID')}
                </Table.Cell>
                <Table.Cell textAlign="center">
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="blue"
                    onClick={(e) => { e.stopPropagation(); setPopupTxId(String(tx.id)) }}
                  >
                    {tx.productCount}
                  </Button>
                </Table.Cell>
                <Table.Cell textAlign="center">
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="blue"
                    onClick={(e) => { e.stopPropagation(); setPopupTxId(String(tx.id)) }}
                  >
                    {tx.piecesCount}
                  </Button>
                </Table.Cell>
                <Table.Cell fontSize="xs" color="gray.500">
                  {formatDateTime(tx.createdAt as Timestamp | undefined)}
                </Table.Cell>
              </Table.Row>
            ))}
            {transactions.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={8}>
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
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <Text fontSize="sm" color="gray.600">{page} / {totalPages}</Text>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
            <ChevronRight size={16} />
          </Button>
        </HStack>
      )}

      {/* Item Detail Popup */}
      {popupTxId && (
        <ItemDetailPopup txId={popupTxId} onClose={() => setPopupTxId(null)} />
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

                  {/* Warehouse + Rack (Stock In only) */}
                  {isStockIn && (
                    <>
                      <Field.Root required>
                        <Field.Label fontSize="sm">Warehouse</Field.Label>
                        <WarehouseSelect
                          value={warehouseId}
                          onChange={(id) => { setWarehouseId(id); setRackId(0) }}
                          w="100%"
                        />
                      </Field.Root>

                      <Field.Root required>
                        <Field.Label fontSize="sm">Destination Rack</Field.Label>
                        <RackSelect
                          value={rackId}
                          onChange={setRackId}
                          warehouseId={warehouseId}
                          w="100%"
                        />
                      </Field.Root>
                    </>
                  )}

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
    </Box>
  )
}
