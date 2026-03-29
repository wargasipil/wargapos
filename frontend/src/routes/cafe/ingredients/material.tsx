import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Dialog, Field, Flex, HStack, Input, NativeSelect,
  Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Pencil, Plus, Trash2, PackagePlus } from 'lucide-react'
import { ingredientClient } from '../../../client'
import { QtyType } from '../../../gen/wargapos/ingredient/v1/service_pb'
import type { Material } from '../../../gen/wargapos/ingredient/v1/service_pb'
import { WarehouseSelect } from '../../../components/shared/WarehouseSelect'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { useAuthStore } from '../../../store/auth'

function qtyLabel(qt: QtyType) {
  return qt === QtyType.GRAM ? 'Gram' : 'Piece'
}

function fmtQty(qty: number, qt: QtyType) {
  return qt === QtyType.GRAM ? `${qty} g` : `${qty} pcs`
}

export function MaterialTab() {
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const isManager = role === 'admin' || role === 'manager'

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Material | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)

  // form state
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [qtyType, setQtyType] = useState<QtyType>(QtyType.PIECE)
  const [qty, setQty] = useState(0)

  // add stock dialog state
  const [stockTarget, setStockTarget] = useState<Material | null>(null)
  const [stockWarehouseId, setStockWarehouseId] = useState(0)
  const [stockQty, setStockQty] = useState('')
  const [stockPrice, setStockPrice] = useState('')
  const [stockNote, setStockNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['materials', search],
    queryFn: () => ingredientClient.listMaterial({ page: 1, pageSize: 50, search }),
  })

  const createMutation = useMutation({
    mutationFn: () => ingredientClient.createMaterial({ code, name, qtyType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['materials-select'] })
      closeDialog()
      toaster.create({ title: 'Material created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => ingredientClient.updateMaterial({
      id: editTarget!.id,
      code,
      name,
      qtyType,
      qty, // pass current value through unchanged
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['materials-select'] })
      closeDialog()
      toaster.create({ title: 'Material updated', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ingredientClient.deleteMaterial({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['materials-select'] })
      setDeleteTarget(null)
      toaster.create({ title: 'Material deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const addStockMutation = useMutation({
    mutationFn: () => ingredientClient.addMaterialStock({
      id: stockTarget!.id,
      warehouseId: stockWarehouseId,
      qty: Number(stockQty),
      price: BigInt(stockPrice),
      note: stockNote,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials', search] })
      qc.invalidateQueries({ queryKey: ['materials-select'] })
      setStockTarget(null)
      toaster.create({ title: 'Stock updated', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreate() {
    setEditTarget(null)
    setCode(''); setName(''); setQtyType(QtyType.PIECE); setQty(0)
    setDialogOpen(true)
  }

  function openEdit(m: Material) {
    setEditTarget(m)
    setCode(m.code); setName(m.name); setQtyType(m.qtyType); setQty(m.qty)
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditTarget(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  const materials = data?.materials ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <Input
          placeholder="Search materials…"
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW={{ md: '220px' }}
        />
        {isManager && (
          <Button colorPalette="blue" size="sm" onClick={openCreate}>
            <Plus size={16} /> Add Material
          </Button>
        )}
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={8}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {materials.map((m) => (
            <Box key={m.id} bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <Flex align="center" justify="space-between" gap={2} wrap="wrap">
                <Box>
                  <HStack gap={2}>
                    <Text fontWeight="semibold" fontFamily="mono">{m.code}</Text>
                    <Text fontSize="xs" px={2} py={0.5} bg="gray.100" borderRadius="sm" color="gray.600">
                      {qtyLabel(m.qtyType)}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.700" mt={0.5}>{m.name}</Text>
                  <Text fontSize="xs" color="gray.500">Stock: {fmtQty(m.qty, m.qtyType)}</Text>
                </Box>
                {isManager && (
                  <HStack gap={2}>
                    <Button size="xs" variant="outline" colorPalette="green" onClick={() => { setStockTarget(m); setStockWarehouseId(0); setStockQty(''); setStockPrice(''); setStockNote('') }}>
                      <PackagePlus size={12} /> Add Stock
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => openEdit(m)}>
                      <Pencil size={12} /> Edit
                    </Button>
                    <Button size="xs" variant="outline" colorPalette="red" onClick={() => setDeleteTarget(m)}>
                      <Trash2 size={12} /> Delete
                    </Button>
                  </HStack>
                )}
              </Flex>
            </Box>
          ))}
          {materials.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>No materials found.</Text>
          )}
        </VStack>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) closeDialog() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="380px">
            <Dialog.Header>
              <Dialog.Title>{editTarget ? 'Edit Material' : 'Add Material'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={3} as="form" id="material-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Code</Field.Label>
                  <Input size="sm" placeholder="e.g. SUGAR" fontFamily="mono" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input size="sm" placeholder="e.g. Sugar" value={name} onChange={(e) => setName(e.target.value)} />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Unit</Field.Label>
                  <NativeSelect.Root size="sm">
                    <NativeSelect.Field value={String(qtyType)} onChange={(e) => setQtyType(Number(e.target.value) as QtyType)}>
                      <option value={String(QtyType.PIECE)}>Piece</option>
                      <option value={String(QtyType.GRAM)}>Gram</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button form="material-form" type="submit" colorPalette="blue" loading={isSaving}>
                {editTarget ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Material"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog.Root open={!!stockTarget} onOpenChange={(d) => { if (!d.open) setStockTarget(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="380px">
            <Dialog.Header>
              <Dialog.Title>Add Stock — {stockTarget?.name}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={3} as="form" id="add-stock-form" onSubmit={(e) => { e.preventDefault(); addStockMutation.mutate() }}>
                <Field.Root required>
                  <Field.Label>Warehouse</Field.Label>
                  <WarehouseSelect value={stockWarehouseId} onChange={setStockWarehouseId} size="sm" w="100%" />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Qty {stockTarget ? `(${stockTarget.qtyType === QtyType.GRAM ? 'g' : 'pcs'})` : ''}</Field.Label>
                  <Input size="sm" type="number" min="1" placeholder="e.g. 100" value={stockQty} onChange={(e) => setStockQty(e.target.value)} autoFocus />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Price (IDR)</Field.Label>
                  <Input size="sm" type="number" placeholder="e.g. 50000" value={stockPrice} onChange={(e) => setStockPrice(e.target.value)} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Note</Field.Label>
                  <Input size="sm" placeholder="Optional note" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setStockTarget(null)}>Cancel</Button>
              <Button form="add-stock-form" type="submit" colorPalette="blue" loading={addStockMutation.isPending}>
                Submit
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  )
}
