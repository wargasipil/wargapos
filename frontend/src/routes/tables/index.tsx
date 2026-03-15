import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, Spinner, Text, VStack,
  Dialog,
} from '@chakra-ui/react'
import { LayoutGrid, Plus, Pencil, Trash2, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { tableClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import type { Table } from '../../gen/wargapos/table/v1/table_pb'

function TableQR({ uuid }: { uuid: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = `${window.location.origin}/menu?table=${uuid}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 120, margin: 1 })
    }
  }, [url])

  return <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
}

export function TablesPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Table | null>(null)
  const [name, setName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Table | null>(null)
  const [tableSearch, setTableSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  const createMutation = useMutation({
    mutationFn: () => tableClient.createTable({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      closeDialog()
      toaster.create({ title: 'Table created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => tableClient.updateTable({ id: editTarget!.id, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      closeDialog()
      toaster.create({ title: 'Table renamed', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => tableClient.deleteTable({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      setDeleteTarget(null)
      toaster.create({ title: 'Table deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreate() { setEditTarget(null); setName(''); setDialogOpen(true) }
  function openEdit(t: Table) { setEditTarget(t); setName(t.name); setDialogOpen(true) }
  function closeDialog() { setDialogOpen(false); setEditTarget(null); setName('') }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  const tables = (data?.tables ?? []).filter((t) =>
    !tableSearch || t.name.toLowerCase().includes(tableSearch.toLowerCase())
  )
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><LayoutGrid size={22} /><Heading size="md">Tables</Heading></HStack>
        <Button colorPalette="blue" size="sm" width={{ base: 'full', md: 'auto' }} onClick={openCreate}>
          <Plus size={16} /> Add Table
        </Button>
      </Flex>

      <Input
        placeholder="Search tables…"
        size="sm"
        value={tableSearch}
        onChange={(e) => setTableSearch(e.target.value)}
        mb={4}
        maxW={{ md: '260px' }}
      />

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <VStack gap={4} align="stretch">
          {tables.map((t) => (
            <Box key={String(t.id)} bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <Flex align="start" gap={4}>
                <Box>
                  <HStack gap={1} mb={1} color="gray.400"><QrCode size={12} /><Text fontSize="xs">Scan to order</Text></HStack>
                  <TableQR uuid={t.uuid} />
                </Box>
                <Box flex={1}>
                  <Text fontWeight="semibold" fontSize="lg" mb={1}>{t.name}</Text>
                  <Box mb={3}>
                    <a
                      href={`${window.location.origin}/menu?table=${t.uuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#3182ce', wordBreak: 'break-all' }}
                    >
                      {window.location.origin}/menu?table={t.uuid}
                    </a>
                  </Box>
                  <HStack gap={2}>
                    <Button size="xs" variant="outline" onClick={() => openEdit(t)}><Pencil size={12} /> Rename</Button>
                    <Button size="xs" variant="outline" colorPalette="red" onClick={() => setDeleteTarget(t)}><Trash2 size={12} /> Delete</Button>
                  </HStack>
                </Box>
              </Flex>
            </Box>
          ))}
          {tables.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>
              No tables yet. Add a table to generate a QR code.
            </Text>
          )}
        </VStack>
      )}

      {/* Add / Rename Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) closeDialog() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="360px">
            <Dialog.Header>
              <Dialog.Title>{editTarget ? 'Rename Table' : 'Add Table'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="table-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Table Name</Field.Label>
                  <Input
                    placeholder="e.g. Table 1, VIP Room"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button form="table-form" type="submit" colorPalette="blue" loading={isSaving}>
                {editTarget ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Table"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? The QR code will stop working.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
