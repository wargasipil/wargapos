import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Badge, Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect,
  Separator, Spinner, Table, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { productClient, stockClient } from '../../client'
import { useAuthStore } from '../../store/auth'
import { formatPrice } from '../../lib/format'
import { stripError } from '../../lib/errors'
import { toaster } from '../../components/ui/toaster'
import type { StockMovement } from '../../gen/wargapos/stock/v1/stock_pb'

function marginPct(priceCents: bigint, cogsCents: bigint): string | null {
  if (cogsCents === 0n || priceCents === 0n) return null
  const pct = Math.round(Number((priceCents - cogsCents) * 100n / priceCents))
  return `${pct}%`
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
      <Text fontSize="sm" color="gray.500">{label}</Text>
      <Text fontSize="sm" fontWeight="medium">{value}</Text>
    </Flex>
  )
}

function fmtDate(raw: string): string {
  const d = new Date(raw.replace(' ', 'T') + 'Z')
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const reasonColor: Record<string, string> = {
  restock: 'green',
  sale: 'blue',
  adjustment: 'orange',
}

export function ProductDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { token } = useAuthStore()
  const qc = useQueryClient()

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productClient.getProduct({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })

  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('restock')
  const [note, setNote] = useState('')

  // Stock history state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [allMovements, setAllMovements] = useState<StockMovement[]>([])

  const { data: movData, isFetching: movFetching } = useQuery({
    queryKey: ['stock-movements', id, page, dateFrom, dateTo],
    queryFn: () => stockClient.listStockMovements({
      productId: BigInt(id),
      page,
      pageSize: 20,
      dateFrom,
      dateTo,
    }),
    enabled: !!id,
  })

  useEffect(() => {
    if (!movData) return
    if (page === 1) {
      setAllMovements(movData.movements)
    } else {
      setAllMovements((prev) => [...prev, ...movData.movements])
    }
  }, [movData])

  function applyDateFilter(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    setPage(1)
    setAllMovements([])
  }

  const adjustMutation = useMutation({
    mutationFn: () =>
      stockClient.adjustStock(
        { productId: BigInt(id), delta: parseInt(delta, 10), reason, note },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] })
      qc.invalidateQueries({ queryKey: ['stock-movements', id] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setPage(1)
      setAllMovements([])
      toaster.create({ title: 'Stock updated', type: 'success', duration: 3000 })
      setDelta('')
      setNote('')
    },
  })

  const categories = catData?.categories ?? []

  if (isLoading) {
    return <Flex justify="center" mt={12}><Spinner /></Flex>
  }

  const p = productData?.product
  if (!p) return <Text p={6}>Product not found.</Text>

  const catName = categories.find((c) => c.id === p.categoryId)?.name ?? ''
  const margin = marginPct(p.priceCents, p.cogsCents)
  const total = movData?.total ?? 0

  return (
    <Box p={{ base: 3, md: 6 }} maxW="600px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/products"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Product Detail</Heading>
        <Button asChild size="sm" variant="outline" ml="auto">
          <Link to="/products/$id/edit" params={{ id }}><Pencil size={14} /> Edit</Link>
        </Button>
      </HStack>

      <Tabs.Root defaultValue="details" variant="line">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="history">Stock History</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="details">
          {p.imageUrl && (
            <img
              src={p.imageUrl}
              style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
            />
          )}

          <VStack align="stretch" gap={3} mb={6}>
            <DetailRow label="Name" value={p.name} />
            {p.description && <DetailRow label="Description" value={p.description} />}
            {catName && <DetailRow label="Category" value={catName} />}
            {p.sku && <DetailRow label="SKU" value={p.sku} />}
            <DetailRow label="Price" value={formatPrice(p.priceCents)} />
            {p.cogsCents > 0n && <DetailRow label="Cost (COGS)" value={formatPrice(p.cogsCents)} />}
            {margin && <DetailRow label="Gross Margin" value={margin} />}
            <DetailRow label="Status" value={p.isActive ? 'Active' : 'Inactive'} />
            <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
              <Text fontSize="sm" color="gray.500">Stock</Text>
              <Text fontSize="sm" fontWeight="bold" color={p.stockQty > 0 ? 'gray.800' : 'red.500'}>
                {p.stockQty > 0 ? p.stockQty : 'Out of stock'}
              </Text>
            </Flex>
          </VStack>

          <Separator mb={6} />

          <Heading size="sm" mb={3}>Adjust Stock</Heading>
          <VStack align="stretch" gap={3}>
            <HStack gap={3}>
              <Field.Root flex={1}>
                <Field.Label fontSize="xs">Delta (+ add / − deduct)</Field.Label>
                <Input
                  type="number"
                  size="sm"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. 10 or -5"
                />
              </Field.Root>
              <Field.Root flex={1}>
                <Field.Label fontSize="xs">Reason</Field.Label>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="restock">Restock</option>
                    <option value="adjustment">Adjustment</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </HStack>
            <Field.Root>
              <Field.Label fontSize="xs">Note (optional)</Field.Label>
              <Input size="sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Received from supplier" />
            </Field.Root>
            {adjustMutation.isError && (
              <Alert.Root status="error" borderRadius="md">
                <Alert.Indicator />
                <Alert.Description fontSize="sm">{stripError(adjustMutation.error)}</Alert.Description>
              </Alert.Root>
            )}
            <Flex justify="flex-end">
              <Button
                size="sm"
                colorPalette="blue"
                loading={adjustMutation.isPending}
                disabled={!delta || delta === '0'}
                onClick={() => adjustMutation.mutate()}
              >
                Apply
              </Button>
            </Flex>
          </VStack>
        </Tabs.Content>

        <Tabs.Content value="history">
          {/* Date filter */}
          <HStack mb={4} gap={2} flexWrap="wrap">
            <Input
              type="date"
              size="sm"
              maxW="140px"
              value={dateFrom}
              onChange={(e) => applyDateFilter(e.target.value, dateTo)}
            />
            <Text fontSize="xs" color="gray.400">–</Text>
            <Input
              type="date"
              size="sm"
              maxW="140px"
              value={dateTo}
              onChange={(e) => applyDateFilter(dateFrom, e.target.value)}
            />
            {(dateFrom || dateTo) && (
              <Button size="xs" variant="ghost" onClick={() => applyDateFilter('', '')}>
                Clear
              </Button>
            )}
          </HStack>

          {allMovements.length === 0 && !movFetching ? (
            <Text color="gray.500" fontSize="sm">No movements yet.</Text>
          ) : (
            <>
              <Table.Root variant="outline" size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Date</Table.ColumnHeader>
                    <Table.ColumnHeader>Delta</Table.ColumnHeader>
                    <Table.ColumnHeader>Reason</Table.ColumnHeader>
                    <Table.ColumnHeader>Note</Table.ColumnHeader>
                    <Table.ColumnHeader>By</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {allMovements.map((m) => (
                    <Table.Row key={String(m.id)}>
                      <Table.Cell fontSize="xs" color="gray.500">{fmtDate(m.createdAt)}</Table.Cell>
                      <Table.Cell fontWeight="medium" color={m.delta > 0 ? 'green.600' : 'red.500'}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={reasonColor[m.reason] ?? 'gray'} size="sm">{m.reason}</Badge>
                      </Table.Cell>
                      <Table.Cell fontSize="xs" color="gray.500">{m.note}</Table.Cell>
                      <Table.Cell fontSize="xs">{m.createdByName || '—'}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              <Flex justify="space-between" align="center" mt={3}>
                <Text fontSize="xs" color="gray.400">{allMovements.length} of {total}</Text>
                {allMovements.length < total && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={movFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Load more
                  </Button>
                )}
              </Flex>
            </>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
