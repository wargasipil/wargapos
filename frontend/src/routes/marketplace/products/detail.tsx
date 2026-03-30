import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, Dialog, Field, Flex, Heading, HStack, Input, Portal, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil, PackagePlus } from 'lucide-react'
import { marketplaceClient, stockClient } from '../../../client'
import { formatPrice, formatDateTime } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { WarehouseSelect } from '../../../components/shared/WarehouseSelect'
import type { Timestamp } from '@bufbuild/protobuf/wkt'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
      <Text fontSize="sm" color="gray.500">{label}</Text>
      <Text fontSize="sm" fontWeight="medium">{value}</Text>
    </Flex>
  )
}

export function MarketplaceProductDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const qc = useQueryClient()

  const [restockOpen, setRestockOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState(0)
  const [qty, setQty] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-product', id],
    queryFn: () => marketplaceClient.getProduct({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => stockClient.listWarehouse({ page: 1, pageSize: 100, search: '' }),
  })

  const warehouseMap = new Map(
    (warehousesData?.warehouses ?? []).map((w) => [w.id, w.name])
  )

  const p = data?.product

  const restockMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.restockProduct({
        productId: BigInt(id),
        warehouseId,
        delta: parseInt(qty, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-product', id] })
      toaster.create({ title: 'Restocked successfully', type: 'success', duration: 2000 })
      setRestockOpen(false)
      setQty('')
      setWarehouseId(0)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  if (isLoading) return <Flex justify="center" mt={12}><Spinner /></Flex>
  if (!p) return <Text p={6} color="gray.400">Product not found.</Text>

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={5} gap={3}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/products"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md" flex={1}>{p.name}</Heading>
        <Button size="sm" variant="outline" colorPalette="green" onClick={() => setRestockOpen(true)}>
          <PackagePlus size={14} /> Restock
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/marketplace/products/$id/edit" params={{ id }}>
            <Pencil size={14} /> Edit
          </Link>
        </Button>
      </HStack>

      <VStack gap={4} align="stretch">
        {/* Image */}
        {p.imageUrl && (
          <Box borderRadius="lg" overflow="hidden" w="full" maxH="260px" bg="gray.100">
            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '260px', objectFit: 'cover' }} />
          </Box>
        )}

        {/* Info + Warehouse side by side on desktop */}
        <Flex gap={4} align="flex-start" direction={{ base: 'column', md: 'row' }}>
          {/* Info card */}
          <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" flex={3} w="full">
            <VStack gap={2} align="stretch">
              <DetailRow label="Price" value={formatPrice(BigInt(p.priceCents))} />
              <DetailRow label="Total Stock" value={p.leftStock.toLocaleString('id-ID')} />
              <DetailRow label="Status" value={
                <Badge colorPalette={p.isActive ? 'green' : 'gray'} size="sm">
                  {p.isActive ? 'Active' : 'Inactive'}
                </Badge>
              } />
              {p.description && (
                <Box pt={1}>
                  <Text fontSize="xs" color="gray.500" mb={1}>Description</Text>
                  <Text fontSize="sm">{p.description}</Text>
                </Box>
              )}
              <DetailRow label="Created" value={formatDateTime(p.createdAt as Timestamp | undefined)} />
              <DetailRow label="Updated" value={formatDateTime(p.updatedAt as Timestamp | undefined)} />
            </VStack>
          </Box>

          {/* Warehouse stock card */}
          <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" flex={{ base: 'none', md: 7 }} w={{ base: 'full', md: 'auto' }}>
            <Text fontWeight="medium" fontSize="sm" mb={3}>Warehouse Stock</Text>
            {p.warehouseStock.length === 0 ? (
              <Text fontSize="sm" color="gray.400">No stock records yet.</Text>
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Warehouse</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Stock</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {p.warehouseStock.map((ws) => (
                    <Table.Row key={ws.warehouseId}>
                      <Table.Cell>
                        {ws.skuId > 0 ? (
                          <Link to="/stock/skus/$id" params={{ id: String(ws.skuId) }}>
                            <Text color="blue.600" _hover={{ textDecoration: 'underline' }} fontSize="sm">
                              {warehouseMap.get(ws.warehouseId) ?? `#${ws.warehouseId}`}
                            </Text>
                          </Link>
                        ) : (
                          <Text fontSize="sm">{warehouseMap.get(ws.warehouseId) ?? `#${ws.warehouseId}`}</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="right">{ws.leftStock.toLocaleString('id-ID')}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </Flex>
      </VStack>

      {/* Restock dialog */}
      <Dialog.Root
        open={restockOpen}
        onOpenChange={({ open }) => { if (!open) { setRestockOpen(false); setQty(''); setWarehouseId(0) } }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="360px">
              <Dialog.Header>
                <Dialog.Title>Restock — {p.name}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  <Field.Root required>
                    <Field.Label fontSize="sm">Warehouse</Field.Label>
                    <WarehouseSelect value={warehouseId} onChange={setWarehouseId} w="full" />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label fontSize="sm">Quantity</Field.Label>
                    <Input
                      type="number"
                      min={1}
                      size="sm"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="e.g. 50"
                      autoFocus
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" size="sm" onClick={() => setRestockOpen(false)}>Cancel</Button>
                <Button
                  colorPalette="green"
                  size="sm"
                  loading={restockMutation.isPending}
                  disabled={!warehouseId || !qty || parseInt(qty, 10) < 1}
                  onClick={() => restockMutation.mutate()}
                >
                  Confirm
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
