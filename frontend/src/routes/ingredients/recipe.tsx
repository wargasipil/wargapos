import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Dialog, Field, Flex, HStack, Input,
  Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { ingredientClient, productClient } from '../../client'
import { QtyType } from '../../gen/wargapos/ingredient/v1/service_pb'
import type { Recipe } from '../../gen/wargapos/ingredient/v1/service_pb'
import { MaterialSelect } from '../../components/shared/MaterialSelect'
import { ProductSelect } from '../../components/shared/ProductSelect'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { useAuthStore } from '../../store/auth'

function fmtQty(qty: number, qt: QtyType) {
  return qt === QtyType.GRAM ? `${qty} g` : `${qty} pcs`
}

interface RecipeRow {
  materialId: number
  qty: string
}

export function RecipeListTab() {
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const isManager = role === 'admin' || role === 'manager'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Recipe | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null)

  // form state
  const [recipeName, setRecipeName] = useState('')
  const [productId, setProductId] = useState(0n)
  const [rows, setRows] = useState<RecipeRow[]>([{ materialId: 0, qty: '' }])

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => ingredientClient.listRecipe({ page: 1, pageSize: 50, search: '' }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productClient.listProducts({ pageSize: 1000 }),
  })

  const productMap = new Map((productsData?.products ?? []).map((p) => [p.id, p.name]))

  const { data: materialsData } = useQuery({
    queryKey: ['materials-select'],
    queryFn: () => ingredientClient.listMaterial({ page: 1, pageSize: 200, search: '' }),
  })
  const materialMap = new Map((materialsData?.materials ?? []).map((m) => [m.id, m.qtyType]))

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
      qc.invalidateQueries({ queryKey: ['recipes'] })
      closeDialog()
      toaster.create({ title: 'Recipe created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => ingredientClient.updateRecipe({
      id: editTarget!.id,
      name: recipeName,
      items: rows.filter((r) => r.materialId > 0 && r.qty !== '').map((r) => ({
        materialId: r.materialId,
        qty: Number(r.qty),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      closeDialog()
      toaster.create({ title: 'Recipe updated', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ingredientClient.deleteRecipe({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      setDeleteTarget(null)
      toaster.create({ title: 'Recipe deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function openCreate() {
    setEditTarget(null)
    setRecipeName(''); setProductId(0n); setRows([{ materialId: 0, qty: '' }])
    setDialogOpen(true)
  }

  function openEdit(r: Recipe) {
    setEditTarget(r)
    setRecipeName(r.name)
    setProductId(0n)
    setRows(r.items.length > 0
      ? r.items.map((it) => ({ materialId: it.materialId, qty: String(it.qty) }))
      : [{ materialId: 0, qty: '' }]
    )
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditTarget(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  function updateRow(i: number, patch: Partial<RecipeRow>) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const recipes = recipesData?.recipes ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      {isManager && (
        <Flex justify="flex-end" mb={4}>
          <Button colorPalette="blue" size="sm" onClick={openCreate}>
            <Plus size={16} /> Add Recipe
          </Button>
        </Flex>
      )}

      {isLoading ? (
        <Flex justify="center" mt={8}><Spinner /></Flex>
      ) : (
        <VStack gap={3} align="stretch">
          {recipes.map((r) => {
            const prodName = productMap.get(BigInt(r.productId)) ?? `#${r.productId}`
            return (
              <Box key={r.id} bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Flex align="center" justify="space-between" gap={2} wrap="wrap">
                  <Box>
                    <Text fontWeight="semibold">{r.name}</Text>
                    <Text fontSize="xs" color="gray.500">Product: {prodName}</Text>
                    <Text fontSize="xs" color="gray.500">{r.items.length} ingredient{r.items.length !== 1 ? 's' : ''}</Text>
                  </Box>
                  {isManager && (
                    <HStack gap={2}>
                      <Button size="xs" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil size={12} /> Edit
                      </Button>
                      <Button size="xs" variant="outline" colorPalette="red" onClick={() => setDeleteTarget(r)}>
                        <Trash2 size={12} /> Delete
                      </Button>
                    </HStack>
                  )}
                </Flex>
                {r.items.length > 0 && (
                  <Box mt={2} borderTopWidth={1} borderColor="gray.100" pt={2}>
                    {r.items.map((it) => (
                      <Text key={it.id} fontSize="xs" color="gray.600">
                        • {it.material?.name ?? `#${it.materialId}`} — {fmtQty(it.qty, it.material?.qtyType ?? QtyType.PIECE)}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            )
          })}
          {recipes.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>No recipes found.</Text>
          )}
        </VStack>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) closeDialog() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="480px">
            <Dialog.Header>
              <Dialog.Title>{editTarget ? 'Edit Recipe' : 'Add Recipe'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="recipe-form" onSubmit={handleSubmit}>
                {!editTarget && (
                  <Field.Root required>
                    <Field.Label>Product</Field.Label>
                    <ProductSelect value={productId} onChange={setProductId} size="sm" minW="100%" />
                  </Field.Root>
                )}
                <Field.Root required>
                  <Field.Label>Recipe Name</Field.Label>
                  <Input size="sm" placeholder="e.g. Latte Recipe" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} autoFocus={!!editTarget} />
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
              <Button form="recipe-form" type="submit" colorPalette="blue" loading={isSaving}>
                {editTarget ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Recipe"
        description={<>Delete recipe <strong>{deleteTarget?.name}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
