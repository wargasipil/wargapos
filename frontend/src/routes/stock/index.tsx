import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, Spinner, Text, VStack, Dialog,
} from '@chakra-ui/react'
import { Warehouse, Plus, Pencil, Trash2 } from 'lucide-react'
import { stockClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import type { Warehouse as WarehouseType } from '../../gen/wargapos/stock/v1/warehouse_pb'

export function WarehousesPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WarehouseType | null>(null)
  const [name, setName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<WarehouseType | null>(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => stockClient.listWarehouse({ page: 1, pageSize: 50, search: '' }),
  })

  const createMutation = useMutation({
    mutationFn: () => stockClient.createWarehouse({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      closeDialog()
      toaster.create({ title: 'Warehouse created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => stockClient.updateWarehouse({ id: editTarget!.id, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      closeDialog()
      toaster.create({ title: 'Warehouse renamed', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockClient.deleteWarehouse({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setDeleteTarget(null)
      toaster.create({ title: 'Warehouse deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreate() { setEditTarget(null); setName(''); setDialogOpen(true) }
  function openEdit(w: WarehouseType) { setEditTarget(w); setName(w.name); setDialogOpen(true) }
  function closeDialog() { setDialogOpen(false); setEditTarget(null); setName('') }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  const warehouses = (data?.warehouses ?? []).filter(
    (w) => !search || w.name.toLowerCase().includes(search.toLowerCase())
  )
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><Warehouse size={22} /><Heading size="md">Warehouses</Heading></HStack>
        <Button colorPalette="blue" size="sm" width={{ base: 'full', md: 'auto' }} onClick={openCreate}>
          <Plus size={16} /> Add Warehouse
        </Button>
      </Flex>

      <Input
        placeholder="Search warehouses…"
        size="sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb={4}
        maxW={{ md: '260px' }}
      />

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {warehouses.map((w) => (
            <Box key={w.id} bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <Flex align="center" justify="space-between">
                <Text fontWeight="semibold">{w.name}</Text>
                <HStack gap={2}>
                  <Button size="xs" variant="outline" onClick={() => openEdit(w)}>
                    <Pencil size={12} /> Rename
                  </Button>
                  <Button size="xs" variant="outline" colorPalette="red" onClick={() => setDeleteTarget(w)}>
                    <Trash2 size={12} /> Delete
                  </Button>
                </HStack>
              </Flex>
            </Box>
          ))}
          {warehouses.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>
              No warehouses yet.
            </Text>
          )}
        </VStack>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) closeDialog() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="360px">
            <Dialog.Header>
              <Dialog.Title>{editTarget ? 'Rename Warehouse' : 'Add Warehouse'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="warehouse-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input
                    placeholder="e.g. Main Storage, Cold Room"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button form="warehouse-form" type="submit" colorPalette="blue" loading={isSaving}>
                {editTarget ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Warehouse"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
