import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Dialog, Field, Flex, Heading, HStack, Input,
  Portal, Spinner, Table, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, ArrowRightLeft, MapPin, SlidersHorizontal } from 'lucide-react'
import { createListCollection, Select } from '@chakra-ui/react'
import { stockClient } from '../../../client'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { formatDateTime } from '../../../lib/format'
import { RackSelect } from '../../../components/shared/RackSelect'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { PlacementType } from '../../../gen/wargapos/stock/v1/placement_pb'

const PLACEMENT_TYPE_LABELS: Record<number, string> = {
  [PlacementType.IN]:     'In',
  [PlacementType.OUT]:    'Out',
  [PlacementType.MOVE]:   'Move',
  [PlacementType.BROKEN]: 'Broken',
  [PlacementType.LOST]:   'Lost',
}
const PLACEMENT_TYPE_COLORS: Record<number, string> = {
  [PlacementType.IN]:     'green',
  [PlacementType.OUT]:    'red',
  [PlacementType.MOVE]:   'blue',
  [PlacementType.BROKEN]: 'orange',
  [PlacementType.LOST]:   'purple',
}

const PAGE_SIZE = 20

export function RackDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const rackId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [logPage, setLogPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Move dialog state
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveSkuId, setMoveSkuId] = useState(0)
  const [moveToRackId, setMoveToRackId] = useState(0)
  const [moveQty, setMoveQty] = useState('')
  const [moveNote, setMoveNote] = useState('')

  const { data: rackData, isLoading } = useQuery({
    queryKey: ['rack', rackId],
    queryFn: () => stockClient.getRack({ by: { case: 'id', value: rackId } }),
    enabled: !!rackId,
  })

  const { data: placementData, isLoading: placementLoading } = useQuery({
    queryKey: ['rack-placement', rackId],
    queryFn: () => stockClient.listRackPlacement({ rackId }),
    enabled: !!rackId,
  })

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ['placement-log', rackId, logPage, dateFrom, dateTo],
    queryFn: () => stockClient.listPlacementLog({ rackId, page: logPage, pageSize: PAGE_SIZE, dateFrom, dateTo }),
    enabled: !!rackId,
  })

  const skuOptions = createListCollection({
    items: [
      { label: 'Select SKU…', value: '0' },
      ...(placementData?.items ?? []).map((item) => ({
        label: item.skuCode,
        value: String(item.skuId),
      })),
    ],
  })

  const moveMutation = useMutation({
    mutationFn: () => {
      if (!moveSkuId) throw new Error('SKU is required')
      if (!moveToRackId) throw new Error('Destination rack is required')
      const qty = Number(moveQty)
      if (!moveQty || qty <= 0) throw new Error('Quantity must be greater than zero')
      return stockClient.createTransaction({
        kind: {
          case: 'move',
          value: {
            move: [{ fromRackId: rackId, toRackId: moveToRackId, change: qty }],
          },
        },
        items: [{ skuId: moveSkuId, quantity: qty, total: 0 }],
        note: moveNote,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack', rackId] })
      qc.invalidateQueries({ queryKey: ['rack-placement', rackId] })
      qc.invalidateQueries({ queryKey: ['placement-log', rackId] })
      toaster.create({ title: 'Stock moved', type: 'success', duration: 2000 })
      setMoveOpen(false)
      setMoveSkuId(0)
      setMoveToRackId(0)
      setMoveQty('')
      setMoveNote('')
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const rack = rackData?.rack
  const items = placementData?.items ?? []
  const logs = logData?.logs ?? []
  const logTotal = logData?.total ?? 0
  const logTotalPages = Math.max(1, Math.ceil(logTotal / PAGE_SIZE))

  if (isLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (!rack) return <Text p={6} color="gray.400">Rack not found.</Text>

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={4} gap={3}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/stock/placement"><ArrowLeft size={16} /></Link>
        </Button>
        <MapPin size={18} />
        <Heading size="md" flex={1}>{rack.name}</Heading>
        <Badge colorPalette="gray" size="sm">Warehouse #{rack.warehouseId}</Badge>
        <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
          <ArrowRightLeft size={14} />
          Move
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={() => navigate({ to: '/stock/placement/$id/adjust', params: { id } } as any)}
        >
          <SlidersHorizontal size={14} />
          Adjust
        </Button>
      </HStack>

      {/* Summary */}
      <HStack mb={5} gap={4} wrap="wrap">
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" minW="120px">
          <Text fontSize="xs" color="gray.500">SKUs</Text>
          <Text fontWeight="bold" fontSize="xl">{rack.skuCount.toLocaleString('id-ID')}</Text>
        </Box>
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" minW="120px">
          <Text fontSize="xs" color="gray.500">Pieces</Text>
          <Text fontWeight="bold" fontSize="xl">{rack.stockCount.toLocaleString('id-ID')}</Text>
        </Box>
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" minW="160px">
          <Text fontSize="xs" color="gray.500">Valuation</Text>
          <Text fontWeight="bold" fontSize="xl">{'Rp\u00a0' + Math.round(rack.stockValuation).toLocaleString('id-ID')}</Text>
        </Box>
      </HStack>

      {/* Move Dialog */}
      <Dialog.Root open={moveOpen} onOpenChange={(e) => setMoveOpen(e.open)} size="sm">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Move Stock</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  <Field.Root required>
                    <Field.Label fontSize="sm">SKU</Field.Label>
                    <Select.Root
                      collection={skuOptions}
                      value={[String(moveSkuId)]}
                      onValueChange={({ value }) => setMoveSkuId(Number(value[0] ?? '0'))}
                      size="sm"
                    >
                      <Select.HiddenSelect />
                      <Select.Control>
                        <Select.Trigger><Select.ValueText /></Select.Trigger>
                        <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                      </Select.Control>
                      <Select.Positioner>
                        <Select.Content>
                          {skuOptions.items.map((item) => (
                            <Select.Item key={item.value} item={item}>
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Select.Root>
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label fontSize="sm">Destination Rack</Field.Label>
                    <RackSelect
                      value={moveToRackId}
                      onChange={setMoveToRackId}
                      warehouseId={rack.warehouseId}
                      excludeRackId={rackId}
                      w="100%"
                    />
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label fontSize="sm">Quantity</Field.Label>
                    <Input
                      size="sm"
                      type="number"
                      min={1}
                      placeholder="e.g. 10"
                      value={moveQty}
                      onChange={(e) => setMoveQty(e.target.value)}
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label fontSize="sm">Note</Field.Label>
                    <Input
                      size="sm"
                      placeholder="e.g. reorganizing shelf"
                      value={moveNote}
                      onChange={(e) => setMoveNote(e.target.value)}
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)}>Cancel</Button>
                <Button
                  colorPalette="blue"
                  size="sm"
                  loading={moveMutation.isPending}
                  onClick={() => moveMutation.mutate()}
                >
                  Move Stock
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Tabs.Root defaultValue="sku" variant="line">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="sku">SKU</Tabs.Trigger>
          <Tabs.Trigger value="log">Placement Log</Tabs.Trigger>
        </Tabs.List>

        {/* SKU Tab */}
        <Tabs.Content value="sku">
          {placementLoading ? (
            <Flex justify="center" py={8}><Spinner /></Flex>
          ) : items.length === 0 ? (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No SKUs in this rack.</Text>
          ) : (
            <Table.Root variant="outline" size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>SKU Code</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Left Stock</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Valuation</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((item) => (
                  <Table.Row key={item.skuId}>
                    <Table.Cell fontFamily="mono" fontSize="xs">{item.skuCode}</Table.Cell>
                    <Table.Cell textAlign="right" fontSize="xs">{item.leftStock.toLocaleString('id-ID')}</Table.Cell>
                    <Table.Cell textAlign="right" fontSize="xs">{'Rp\u00a0' + Math.round(item.valuation).toLocaleString('id-ID')}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Tabs.Content>

        {/* Placement Log Tab */}
        <Tabs.Content value="log">
          <HStack mb={3} gap={2} wrap="wrap">
            <Input size="sm" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setLogPage(1) }} maxW="150px" />
            <Input size="sm" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setLogPage(1) }} maxW="150px" />
          </HStack>

          {logLoading ? (
            <Flex justify="center" py={8}><Spinner /></Flex>
          ) : logs.length === 0 ? (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No placement logs.</Text>
          ) : (
            <Table.Root variant="outline" size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>SKU</Table.ColumnHeader>
                  <Table.ColumnHeader>Type</Table.ColumnHeader>
                  <Table.ColumnHeader>From Rack</Table.ColumnHeader>
                  <Table.ColumnHeader>To Rack</Table.ColumnHeader>
                  <Table.ColumnHeader>Tx#</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Change</Table.ColumnHeader>
                  <Table.ColumnHeader>Actor</Table.ColumnHeader>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {logs.map((log) => (
                  <Table.Row key={String(log.id)}>
                    <Table.Cell fontFamily="mono" fontSize="xs">{log.skuCode}</Table.Cell>
                    <Table.Cell>
                      <Badge size="sm" colorPalette={PLACEMENT_TYPE_COLORS[log.placementType] ?? 'gray'}>
                        {PLACEMENT_TYPE_LABELS[log.placementType] ?? 'Unknown'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500">{log.fromRackName || '—'}</Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500">{log.toRackName || '—'}</Table.Cell>
                    <Table.Cell fontFamily="mono" fontSize="xs" color="gray.500">
                      {log.transactionId ? `#${String(log.transactionId)}` : '—'}
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontSize="xs">
                      <Text color={log.change >= 0 ? 'green.600' : 'red.600'}>
                        {log.change >= 0 ? '+' : ''}{log.change}
                      </Text>
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500">{log.actorName || '—'}</Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500">
                      {formatDateTime(log.createdAt as Timestamp | undefined)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}

          {logTotal > 0 && (
            <HStack justify="center" mt={4} gap={3}>
              <Button size="sm" variant="outline" disabled={logPage <= 1} onClick={() => setLogPage(logPage - 1)}>‹</Button>
              <Text fontSize="sm" color="gray.600">{logPage} / {logTotalPages}</Text>
              <Button size="sm" variant="outline" disabled={logPage >= logTotalPages} onClick={() => setLogPage(logPage + 1)}>›</Button>
            </HStack>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
