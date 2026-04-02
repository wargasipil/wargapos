import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Dialog, Field, Flex, Heading, HStack, Input,
  Portal, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { stockClient } from '../../../client'
import { formatDateTime } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import type { Rack } from '../../../gen/wargapos/stock/v1/rack_pb'
import type { Timestamp } from '@bufbuild/protobuf/wkt'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
      <Text fontSize="sm" color="gray.500">{label}</Text>
      <Text fontSize="sm" fontWeight="medium">{value}</Text>
    </Flex>
  )
}

export function WarehouseDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const warehouseId = Number(id)
  const qc = useQueryClient()
  const navigate = useNavigate()

  // Warehouse edit dialog
  const [editWarehouseOpen, setEditWarehouseOpen] = useState(false)
  const [warehouseName, setWarehouseName] = useState('')
  const [warehouseAddress, setWarehouseAddress] = useState('')
  const [warehouseContact, setWarehouseContact] = useState('')

  // Warehouse delete
  const [deleteWarehouseOpen, setDeleteWarehouseOpen] = useState(false)

  // Rack dialog (create / edit)
  const [rackDialogOpen, setRackDialogOpen] = useState(false)
  const [rackTarget, setRackTarget] = useState<Rack | null>(null)
  const [rackName, setRackName] = useState('')

  // Rack delete
  const [deleteRackTarget, setDeleteRackTarget] = useState<Rack | null>(null)

  const { data: warehouseData, isLoading } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: () => stockClient.getWarehouse({ ids: [warehouseId] }),
    enabled: !!warehouseId,
  })

  const { data: racksData } = useQuery({
    queryKey: ['racks', warehouseId],
    queryFn: () => stockClient.listRack({ page: 1, pageSize: 100, filter: { warehouseId } }),
    enabled: !!warehouseId,
  })

  const warehouse = warehouseData?.warehouses[warehouseId]
  const racks = racksData?.racks ?? []

  // Warehouse mutations
  const updateWarehouseMutation = useMutation({
    mutationFn: () => stockClient.updateWarehouse({ id: warehouseId, name: warehouseName, address: warehouseAddress, contact: warehouseContact }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse', warehouseId] })
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setEditWarehouseOpen(false)
      toaster.create({ title: 'Warehouse renamed', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteWarehouseMutation = useMutation({
    mutationFn: () => stockClient.deleteWarehouse({ id: warehouseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toaster.create({ title: 'Warehouse deleted', type: 'success', duration: 2000 })
      navigate({ to: '/stock' })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  // Rack mutations
  const createRackMutation = useMutation({
    mutationFn: () => stockClient.createRack({ warehouseId, name: rackName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racks', warehouseId] })
      closeRackDialog()
      toaster.create({ title: 'Rack created', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateRackMutation = useMutation({
    mutationFn: () => stockClient.updateRack({ id: rackTarget!.id, name: rackName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racks', warehouseId] })
      closeRackDialog()
      toaster.create({ title: 'Rack renamed', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteRackMutation = useMutation({
    mutationFn: (rackId: number) => stockClient.deleteRack({ id: rackId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racks', warehouseId] })
      setDeleteRackTarget(null)
      toaster.create({ title: 'Rack deleted', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreateRack() { setRackTarget(null); setRackName(''); setRackDialogOpen(true) }
  function openEditRack(r: Rack) { setRackTarget(r); setRackName(r.name); setRackDialogOpen(true) }
  function closeRackDialog() { setRackDialogOpen(false); setRackTarget(null); setRackName('') }
  function handleRackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rackTarget) updateRackMutation.mutate()
    else createRackMutation.mutate()
  }

  const isRackSaving = createRackMutation.isPending || updateRackMutation.isPending

  if (isLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (!warehouse) return <Text p={6} color="gray.400">Warehouse not found.</Text>

  return (
    <Box p={{ base: 3, md: 6 }}>
      {/* Header */}
      <HStack mb={5} gap={3}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/stock"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md" flex={1}>{warehouse.name}</Heading>
        <Button size="sm" variant="outline" onClick={() => { setWarehouseName(warehouse.name); setWarehouseAddress(warehouse.address); setWarehouseContact(warehouse.contact); setEditWarehouseOpen(true) }}>
          <Pencil size={14} /> Rename
        </Button>
        <Button size="sm" variant="outline" colorPalette="red" onClick={() => setDeleteWarehouseOpen(true)}>
          <Trash2 size={14} /> Delete
        </Button>
      </HStack>

      <Flex gap={4} align="flex-start" direction={{ base: 'column', md: 'row' }}>
        {/* Info card */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" minW="220px" w={{ base: 'full', md: 'auto' }}>
          <Text fontWeight="medium" fontSize="sm" mb={3}>Info</Text>
          <VStack gap={2} align="stretch">
            {warehouse.address && <DetailRow label="Address" value={warehouse.address} />}
            {warehouse.contact && <DetailRow label="Contact" value={warehouse.contact} />}
            <DetailRow label="Left Stock" value={warehouse.totalLeftStock.toLocaleString('id-ID')} />
            <DetailRow label="Stock Valuation" value={'Rp\u00a0' + Math.round(warehouse.totalStockValuation).toLocaleString('id-ID')} />
            <DetailRow label="Created" value={formatDateTime(warehouse.createdAt as Timestamp | undefined)} />
            <DetailRow label="Updated" value={formatDateTime(warehouse.updatedAt as Timestamp | undefined)} />
          </VStack>
        </Box>

        {/* Racks card */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" flex={1} w="full">
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="medium" fontSize="sm">Racks</Text>
            <Button size="xs" colorPalette="blue" onClick={openCreateRack}>
              <Plus size={13} /> Add Rack
            </Button>
          </Flex>

          {racks.length === 0 ? (
            <Text fontSize="sm" color="gray.400">No racks yet.</Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Stock</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Valuation</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {racks.map((r) => (
                  <Table.Row key={r.id}>
                    <Table.Cell fontWeight="medium">{r.name}</Table.Cell>
                    <Table.Cell textAlign="right">{r.stockCount.toLocaleString('id-ID')}</Table.Cell>
                    <Table.Cell textAlign="right">{'Rp\u00a0' + Math.round(r.stockValuation).toLocaleString('id-ID')}</Table.Cell>
                    <Table.Cell textAlign="right">
                      <HStack gap={1} justify="flex-end">
                        <Button size="2xs" variant="ghost" onClick={() => openEditRack(r)}>
                          <Pencil size={12} />
                        </Button>
                        <Button size="2xs" variant="ghost" colorPalette="red" onClick={() => setDeleteRackTarget(r)}>
                          <Trash2 size={12} />
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Flex>

      {/* Warehouse rename dialog */}
      <Dialog.Root open={editWarehouseOpen} onOpenChange={({ open }) => { if (!open) setEditWarehouseOpen(false) }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="360px">
              <Dialog.Header><Dialog.Title>Rename Warehouse</Dialog.Title></Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  <Field.Root required>
                    <Field.Label>Name</Field.Label>
                    <Input
                      value={warehouseName}
                      onChange={(e) => setWarehouseName(e.target.value)}
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Address</Field.Label>
                    <Input
                      placeholder="e.g. Jl. Sudirman No. 10, Jakarta"
                      value={warehouseAddress}
                      onChange={(e) => setWarehouseAddress(e.target.value)}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Contact</Field.Label>
                    <Input
                      placeholder="+62 812-3456-7890"
                      value={warehouseContact}
                      onChange={(e) => setWarehouseContact(e.target.value)}
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={() => setEditWarehouseOpen(false)}>Cancel</Button>
                <Button
                  colorPalette="blue"
                  loading={updateWarehouseMutation.isPending}
                  disabled={!warehouseName.trim()}
                  onClick={() => updateWarehouseMutation.mutate()}
                >
                  Save
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Rack create/edit dialog */}
      <Dialog.Root open={rackDialogOpen} onOpenChange={({ open }) => { if (!open) closeRackDialog() }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="360px">
              <Dialog.Header>
                <Dialog.Title>{rackTarget ? 'Rename Rack' : 'Add Rack'}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} as="form" id="rack-form" onSubmit={handleRackSubmit}>
                  <Field.Root required>
                    <Field.Label>Name</Field.Label>
                    <Input
                      placeholder="e.g. Shelf A, Row 1"
                      value={rackName}
                      onChange={(e) => setRackName(e.target.value)}
                      autoFocus
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={closeRackDialog}>Cancel</Button>
                <Button
                  form="rack-form"
                  type="submit"
                  colorPalette="blue"
                  loading={isRackSaving}
                  disabled={!rackName.trim()}
                >
                  {rackTarget ? 'Save' : 'Create'}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Warehouse delete confirm */}
      <ConfirmDialog
        open={deleteWarehouseOpen}
        title="Delete Warehouse"
        description={<>Delete <strong>{warehouse.name}</strong> and all its racks? This cannot be undone.</>}
        confirmLabel="Delete"
        loading={deleteWarehouseMutation.isPending}
        onConfirm={() => deleteWarehouseMutation.mutate()}
        onCancel={() => setDeleteWarehouseOpen(false)}
      />

      {/* Rack delete confirm */}
      <ConfirmDialog
        open={!!deleteRackTarget}
        title="Delete Rack"
        description={<>Delete rack <strong>{deleteRackTarget?.name}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        loading={deleteRackMutation.isPending}
        onConfirm={() => deleteRackTarget && deleteRackMutation.mutate(deleteRackTarget.id)}
        onCancel={() => setDeleteRackTarget(null)}
      />
    </Box>
  )
}
