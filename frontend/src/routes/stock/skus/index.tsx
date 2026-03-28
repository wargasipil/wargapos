import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, Spinner, Text, VStack, Dialog,
} from '@chakra-ui/react'
import { Barcode, Plus } from 'lucide-react'
import { stockClient } from '../../../client'
import { WarehouseSelect } from '../../../components/shared/WarehouseSelect'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import type { Sku } from '../../../gen/wargapos/stock/v1/sku_pb'
import { SkuListItem } from '../components/SkuListItem'

export function SkusPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Sku | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sku | null>(null)
  const [search, setSearch] = useState('')
  const [filterWarehouse, setFilterWarehouse] = useState(0)

  // form state
  const [code, setCode] = useState('')
  const [productId, setProductId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [warehouseId, setWarehouseId] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['skus', filterWarehouse, search],
    queryFn: () => stockClient.listSku({ page: 1, pageSize: 50, search, productId: 0 }),
  })

  const createMutation = useMutation({
    mutationFn: () => stockClient.createSku({
      code,
      productId: Number(productId),
      branchId: Number(branchId),
      warehouseId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skus'] })
      closeDialog()
      toaster.create({ title: 'SKU created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => stockClient.updateSku({ id: editTarget!.id, code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skus'] })
      closeDialog()
      toaster.create({ title: 'SKU updated', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockClient.deleteSku({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skus'] })
      setDeleteTarget(null)
      toaster.create({ title: 'SKU deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreate() {
    setEditTarget(null)
    setCode(''); setProductId(''); setBranchId(''); setWarehouseId(0)
    setDialogOpen(true)
  }
  function openEdit(s: Sku) {
    setEditTarget(s)
    setCode(s.code)
    setDialogOpen(true)
  }
  function closeDialog() { setDialogOpen(false); setEditTarget(null) }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  const skus = (data?.skus ?? []).filter((s) => {
    if (filterWarehouse > 0 && s.warehouseId !== filterWarehouse) return false
    if (search && !s.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><Barcode size={22} /><Heading size="md">SKUs</Heading></HStack>
        <Button colorPalette="blue" size="sm" width={{ base: 'full', md: 'auto' }} onClick={openCreate}>
          <Plus size={16} /> Add SKU
        </Button>
      </Flex>

      <HStack mb={4} gap={2}>
        <Input
          placeholder="Search by code…"
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="220px"
        />
        <WarehouseSelect value={filterWarehouse} onChange={setFilterWarehouse} withAll w="180px" />
      </HStack>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {skus.map((s) => (
            <SkuListItem key={s.id} sku={s} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
          {skus.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>No SKUs found.</Text>
          )}
        </VStack>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) closeDialog() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>{editTarget ? 'Edit SKU' : 'Add SKU'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="sku-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Code</Field.Label>
                  <Input
                    placeholder="e.g. SUGAR-1KG"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    fontFamily="mono"
                    autoFocus
                  />
                </Field.Root>

                {!editTarget && (
                  <>
                    <Field.Root required>
                      <Field.Label>Warehouse</Field.Label>
                      <WarehouseSelect value={warehouseId} onChange={setWarehouseId} size="md" w="100%" />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label>Product ID</Field.Label>
                      <Input
                        type="number"
                        placeholder="Product ID"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                      />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label>Branch ID</Field.Label>
                      <Input
                        type="number"
                        placeholder="Branch ID"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                      />
                    </Field.Root>
                  </>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button form="sku-form" type="submit" colorPalette="blue" loading={isSaving}>
                {editTarget ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete SKU"
        description={<>Delete SKU <strong>{deleteTarget?.code}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
