import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Badge, Box, Button, Dialog, Flex, Heading, HStack, Portal,
  Spinner, Table, Text,
} from '@chakra-ui/react'
import { MapPin, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { stockClient } from '../../../client'
import { WarehouseSelect } from '../../../components/shared/WarehouseSelect'
import { SkuSelect } from '../../../components/shared/SkuSelect'

function RackPopup({ rackId, rackName, onClose }: { rackId: number; rackName: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['rack-placement', rackId],
    queryFn: () => stockClient.listRackPlacement({ rackId }),
  })
  const items = data?.items ?? []

  return (
    <Dialog.Root open onOpenChange={({ open }) => { if (!open) onClose() }} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                <HStack gap={2}>
                  <MapPin size={16} />
                  <Text>{rackName}</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {isLoading ? (
                <Flex justify="center" py={6}><Spinner /></Flex>
              ) : items.length === 0 ? (
                <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No SKUs in this rack.</Text>
              ) : (
                <Table.Root variant="outline" size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>SKU</Table.ColumnHeader>
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

export function PlacementPage() {
  const navigate = useNavigate()
  const [warehouseId, setWarehouseId] = useState(0)
  const [skuId, setSkuId] = useState(0)
  const [popupRack, setPopupRack] = useState<{ id: number; name: string } | null>(null)

  const { data: racksData, isLoading } = useQuery({
    queryKey: ['racks', warehouseId, skuId],
    queryFn: () => stockClient.listRack({
      page: 1,
      pageSize: 100,
      filter: { warehouseId, skuId },
    }),
  })

  const { data: warehouseData } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => stockClient.listWarehouse({ page: 1, pageSize: 100, search: '' }),
  })
  const warehouseMap = new Map(warehouseData?.warehouses.map((w) => [w.id, w.name]) ?? [])

  const racks = racksData?.racks ?? []

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={4} justify="space-between">
        <HStack gap={2}>
          <MapPin size={20} />
          <Heading size="md">Placement</Heading>
        </HStack>
      </HStack>

      <HStack mb={4} gap={2} align="center" wrap="wrap">
        <SlidersHorizontal size={14} color="gray" />
        <WarehouseSelect value={warehouseId} onChange={setWarehouseId} withAll w="180px" />
        <SkuSelect value={skuId} onChange={setSkuId} placeholder="All SKUs" w="200px" />
      </HStack>

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : (
        <Table.Root variant="outline" size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Rack</Table.ColumnHeader>
              {!warehouseId && <Table.ColumnHeader>Warehouse</Table.ColumnHeader>}
              <Table.ColumnHeader textAlign="center">SKUs</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Pieces</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Valuation</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {racks.map((rack) => (
              <Table.Row key={rack.id}>
                <Table.Cell fontWeight="medium">{rack.name}</Table.Cell>
                {!warehouseId && (
                  <Table.Cell fontSize="xs" color="gray.500">
                    {warehouseMap.get(rack.warehouseId) ?? `#${rack.warehouseId}`}
                  </Table.Cell>
                )}
                <Table.Cell textAlign="center">
                  <Button
                    size="xs" variant="ghost" colorPalette="blue"
                    onClick={() => setPopupRack({ id: rack.id, name: rack.name })}
                  >
                    {rack.skuCount}
                  </Button>
                </Table.Cell>
                <Table.Cell textAlign="center">
                  <Button
                    size="xs" variant="ghost" colorPalette="blue"
                    onClick={() => setPopupRack({ id: rack.id, name: rack.name })}
                  >
                    {rack.stockCount.toLocaleString('id-ID')}
                  </Button>
                </Table.Cell>
                <Table.Cell textAlign="right" fontSize="xs" fontFamily="mono">
                  {'Rp\u00a0' + Math.round(rack.stockValuation).toLocaleString('id-ID')}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Button
                    size="xs" variant="outline" colorPalette="gray"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => navigate({ to: '/stock/placement/$id', params: { id: String(rack.id) } } as any)}
                  >
                    Detail
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
            {racks.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={warehouseId ? 5 : 6}>
                  <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No racks found.</Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      )}

      {popupRack && (
        <RackPopup rackId={popupRack.id} rackName={popupRack.name} onClose={() => setPopupRack(null)} />
      )}
    </Box>
  )
}
