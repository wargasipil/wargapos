import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Dialog, Field, Flex, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Code, ConnectError } from '@connectrpc/connect'
import { ingredientClient } from '../../../client'
import { QtyType } from '../../../gen/wargapos/ingredient/v1/service_pb'
import type { Recipe } from '../../../gen/wargapos/ingredient/v1/service_pb'
import { MaterialSelect } from '../../../components/shared/MaterialSelect'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { useAuthStore } from '../../../store/auth'

function fmtQty(qty: number, qt: QtyType) {
  return qt === QtyType.GRAM ? `${qty} g` : `${qty} pcs`
}

interface RecipeRow {
  materialId: number
  qty: string
}

interface Props {
  productId: string
}

export function RecipeTab({ productId }: Props) {
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const isManager = role === 'admin' || role === 'manager'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [rows, setRows] = useState<RecipeRow[]>([{ materialId: 0, qty: '' }])

  const { data: materialsData } = useQuery({
    queryKey: ['materials-select'],
    queryFn: () => ingredientClient.listMaterial({ page: 1, pageSize: 200, search: '' }),
  })
  const materialMap = new Map((materialsData?.materials ?? []).map((m) => [m.id, m.qtyType]))

  const { data, isLoading } = useQuery({
    queryKey: ['recipe', productId],
    queryFn: () => ingredientClient.getRecipe({ productId: Number(productId) }),
    retry: (failureCount, error) => {
      if (error instanceof ConnectError && error.code === Code.NotFound) return false
      return failureCount < 2
    },
  })

  const recipe: Recipe | undefined = data?.recipe

  const createMutation = useMutation({
    mutationFn: () => ingredientClient.createRecipe({
      productId: Number(productId),
      name: recipeName,
      items: rows.filter((r) => r.materialId > 0 && r.qty !== '').map((r) => ({
        materialId: r.materialId,
        qty: Number(r.qty),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
      closeDialog()
      toaster.create({ title: 'Recipe saved', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => ingredientClient.updateRecipe({
      id: recipe!.id,
      name: recipeName,
      items: rows.filter((r) => r.materialId > 0 && r.qty !== '').map((r) => ({
        materialId: r.materialId,
        qty: Number(r.qty),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
      closeDialog()
      toaster.create({ title: 'Recipe updated', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => ingredientClient.deleteRecipe({ id: recipe!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
      setConfirmDelete(false)
      toaster.create({ title: 'Recipe deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreate() {
    setRecipeName('')
    setRows([{ materialId: 0, qty: '' }])
    setDialogOpen(true)
  }

  function openEdit() {
    if (!recipe) return
    setRecipeName(recipe.name)
    setRows(recipe.items.length > 0
      ? recipe.items.map((it) => ({ materialId: it.materialId, qty: String(it.qty) }))
      : [{ materialId: 0, qty: '' }]
    )
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (recipe) updateMutation.mutate()
    else createMutation.mutate()
  }

  function updateRow(i: number, patch: Partial<RecipeRow>) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) return <Flex justify="center" mt={8}><Spinner /></Flex>

  return (
    <Box pt={2}>
      {!recipe ? (
        <Flex direction="column" align="center" py={10} gap={3}>
          <Text color="gray.400" fontSize="sm">No recipe set for this product.</Text>
          {isManager && (
            <Button size="sm" colorPalette="blue" onClick={openCreate}>
              <Plus size={16} /> Set Recipe
            </Button>
          )}
        </Flex>
      ) : (
        <Box>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="semibold">{recipe.name}</Text>
            {isManager && (
              <HStack gap={2}>
                <Button size="xs" variant="outline" onClick={openEdit}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button size="xs" variant="outline" colorPalette="red" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={12} /> Delete
                </Button>
              </HStack>
            )}
          </Flex>

          <Box borderWidth={1} borderColor="gray.100" borderRadius="md" overflow="hidden">
            <Box as="table" w="full" fontSize="sm">
              <Box as="thead" bg="gray.50">
                <Box as="tr">
                  <Box as="th" textAlign="left" px={3} py={2} fontWeight="medium" color="gray.600">Material</Box>
                  <Box as="th" textAlign="right" px={3} py={2} fontWeight="medium" color="gray.600">Qty</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {recipe.items.map((it) => (
                  <Box as="tr" key={it.id} borderTopWidth={1} borderColor="gray.100">
                    <Box as="td" px={3} py={2}>{it.material?.name ?? `#${it.materialId}`}</Box>
                    <Box as="td" px={3} py={2} textAlign="right" fontFamily="mono">
                      {fmtQty(it.qty, it.material?.qtyType ?? QtyType.PIECE)}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Create/Edit dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) closeDialog() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="460px">
            <Dialog.Header>
              <Dialog.Title>{recipe ? 'Edit Recipe' : 'Set Recipe'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="recipe-tab-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Recipe Name</Field.Label>
                  <Input size="sm" placeholder="e.g. Latte Recipe" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} autoFocus />
                </Field.Root>

                <Box w="full">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Ingredients</Text>
                  <VStack gap={2} align="stretch">
                    {rows.map((row, i) => (
                      <HStack key={i} gap={2}>
                        <Box flex={1}>
                          <MaterialSelect value={row.materialId} onChange={(id) => updateRow(i, { materialId: id })} size="sm" minW="0" />
                        </Box>
                        <Input
                          size="sm"
                          type="number"
                          placeholder="Qty"
                          w="80px"
                          value={row.qty}
                          onChange={(e) => updateRow(i, { qty: e.target.value })}
                        />
                        <Text fontSize="xs" color="gray.500" w="28px">
                          {row.materialId > 0 ? (materialMap.get(row.materialId) === QtyType.GRAM ? 'g' : 'pcs') : ''}
                        </Text>
                        {rows.length > 1 && (
                          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}>
                            <X size={12} />
                          </Button>
                        )}
                      </HStack>
                    ))}
                  </VStack>
                  <Button size="xs" variant="outline" mt={2} onClick={() => setRows((prev) => [...prev, { materialId: 0, qty: '' }])}>
                    <Plus size={12} /> Add ingredient
                  </Button>
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button form="recipe-tab-form" type="submit" colorPalette="blue" loading={isSaving}>
                {recipe ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Recipe"
        description={<>Delete recipe <strong>{recipe?.name}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Box>
  )
}
