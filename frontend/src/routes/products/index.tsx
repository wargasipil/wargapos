import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Flex, Heading, Input, Spinner, Table, Text,
  Dialog, Field, VStack,
} from '@chakra-ui/react'
import { productClient } from '../../client'
import type { Product } from '../../gen/wargapos/product/v1/product_pb'

function formatPrice(cents: bigint): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(cents))
}

interface ProductForm {
  name: string
  description: string
  categoryId: string
  priceCents: string
  sku: string
}

const emptyForm: ProductForm = { name: '', description: '', categoryId: '', priceCents: '', sku: '' }

export function ProductsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productClient.listProducts({ page: 1, pageSize: 100, categoryId: '' }),
  })

  const createMutation = useMutation({
    mutationFn: () => productClient.createProduct({
      name: form.name,
      description: form.description,
      categoryId: form.categoryId,
      priceCents: BigInt(form.priceCents || '0'),
      sku: form.sku,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeDrawer() },
  })

  const updateMutation = useMutation({
    mutationFn: () => productClient.updateProduct({
      id: editTarget!.id,
      name: form.name,
      priceCents: BigInt(form.priceCents || '0'),
      isActive: true,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeDrawer() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productClient.deleteProduct({ id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteTarget(null) },
  })

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setDrawerOpen(true)
  }

  function openEdit(p: Product) {
    setEditTarget(p)
    setForm({ name: p.name, description: p.description, categoryId: p.categoryId, priceCents: String(p.priceCents), sku: p.sku })
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  const products = data?.products ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">Products</Heading>
        <Button colorPalette="blue" size="sm" onClick={openCreate}>+ Add Product</Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Price</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {products.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell fontWeight="medium">{p.name}</Table.Cell>
                <Table.Cell color="gray.500" fontSize="sm">{p.sku}</Table.Cell>
                <Table.Cell>{formatPrice(p.priceCents)}</Table.Cell>
                <Table.Cell>
                  <Text fontSize="xs" px={2} py={0.5} borderRadius="full" bg={p.isActive ? 'green.100' : 'gray.100'} color={p.isActive ? 'green.700' : 'gray.500'} display="inline-block">
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap={2} justify="flex-end">
                    <Button size="xs" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(p)}>Delete</Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
            {products.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center" color="gray.400" py={8}>No products yet.</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      )}

      {/* Add / Edit Drawer */}
      <Dialog.Root open={drawerOpen} onOpenChange={(d) => { if (!d.open) closeDrawer() }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>{editTarget ? 'Edit Product' : 'Add Product'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="product-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>SKU</Field.Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Price (IDR)</Field.Label>
                  <Input type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} />
                </Field.Root>
              </VStack>
              {(createMutation.error || updateMutation.error) && (
                <Text color="red.500" fontSize="sm" mt={2}>
                  {String(createMutation.error ?? updateMutation.error)}
                </Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDrawer}>Cancel</Button>
              <Button form="product-form" type="submit" colorPalette="blue" loading={isSaving}>
                {editTarget ? 'Save' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete Confirm */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={(d) => { if (!d.open) setDeleteTarget(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="360px">
            <Dialog.Header>
              <Dialog.Title>Delete Product</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                colorPalette="red"
                loading={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
