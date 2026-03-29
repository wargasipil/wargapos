import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Dialog, Field, Flex, Grid, Heading, HStack, IconButton, Input, Popover, Spinner, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Package, Plus, Search, Tag, Pencil, Trash2, Download } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { productClient } from '../../../client'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import { CategorySelect } from '../../../components/shared/CategorySelect'
import { ProductCard } from '../../../components/shared/ProductCard'
import type { Product } from '../../../gen/wargapos/product/v1/product_pb'
import type { Category } from '../../../gen/wargapos/product/v1/product_pb'
import { productsToCSV, downloadCSV } from '../../../lib/csv'

type StatusFilter = 'all' | 'active' | 'inactive'

function marginPct(priceCents: bigint, cogsCents: bigint): string | null {
  if (cogsCents === 0n || priceCents === 0n) return null
  const pct = Math.round(Number((priceCents - cogsCents) * 100n / priceCents))
  return `${pct}%`
}

export function ProductsPage() {
  const qc = useQueryClient()

  // Product state
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<bigint | null>(null)
  const [categoryId, setCategoryId] = useState<bigint>(0n)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allProducts, setAllProducts] = useState<Product[]>([])

  // Category dialog state
  const [catOpen, setCatOpen] = useState(false)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [catFormMode, setCatFormMode] = useState<'add' | 'edit'>('add')
  const [catEditTarget, setCatEditTarget] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catDeleteTarget, setCatDeleteTarget] = useState<Category | null>(null)

  const activeOnly   = statusFilter === 'active'
  const inactiveOnly = statusFilter === 'inactive'
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', String(categoryId), statusFilter, search, page],
    queryFn: () => productClient.listProducts({ page, pageSize: 20, categoryId, activeOnly, inactiveOnly, search }),
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!data || isFetching) return
    if (page === 1) setAllProducts(data.products)
    else setAllProducts((prev) => [...prev, ...data.products])
  }, [data, isFetching])

  useEffect(() => {
    setPage(1)
    setAllProducts([])
  }, [categoryId, statusFilter, search])

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })
  const categories = catData?.categories ?? []

  function categoryName(id: bigint): string {
    return categories.find((c) => c.id === id)?.name ?? ''
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await productClient.listProducts({ pageSize: 1000 })
      const catMap = new Map(categories.map((c) => [c.id, c.name]))
      const csv = productsToCSV(res.products, (id) => catMap.get(id) ?? '')
      downloadCSV(`products-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    } catch (e) {
      toaster.create({ title: stripError(e), type: 'error', duration: 4000 })
    } finally {
      setExporting(false)
    }
  }

  // Product mutations
  const toggleMutation = useMutation({
    mutationFn: (p: Product) => {
      setTogglingId(p.id)
      return productClient.updateProduct({
        id: p.id, name: p.name, priceCents: p.priceCents, cogsCents: p.cogsCents,
        isActive: !p.isActive, imageUrl: p.imageUrl,
      })
    },
    onSettled: () => setTogglingId(null),
    onSuccess: () => {
      setPage(1)
      setAllProducts([])
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => productClient.deleteProduct({ id }),
    onSuccess: () => {
      setPage(1)
      setAllProducts([])
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
      toaster.create({ title: 'Product deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  // Category mutations
  const createCatMutation = useMutation({
    mutationFn: () => productClient.createCategory({ name: catName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setCatFormOpen(false)
      setCatName('')
      toaster.create({ title: 'Category created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const renameCatMutation = useMutation({
    mutationFn: () => productClient.updateCategory({ id: catEditTarget!.id, name: catName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setCatFormOpen(false)
      setCatName('')
      toaster.create({ title: 'Category renamed', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id: bigint) => productClient.deleteCategory({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setCatDeleteTarget(null)
      toaster.create({ title: 'Category deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const products = allProducts
  const total = data?.total ?? 0

  return (
    <Box p={{ base: 3, md: 6 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><Package size={22} /><Heading size="md">Products</Heading></HStack>
        <HStack gap={2} width={{ base: 'full', md: 'auto' }}>
          <Button size="sm" variant="outline" onClick={() => setCatOpen(true)}>
            <Tag size={14} /> Categories
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} loading={exporting}>
            <Download size={14} /> Export
          </Button>
          <Button asChild colorPalette="blue" size="sm" flex={{ base: 1, md: 'unset' }}>
            <Link to="/cafe/products/new"><Plus size={16} /> Add Product</Link>
          </Button>
        </HStack>
      </Flex>

      <Flex gap={2} mb={4} align="center" wrap="wrap">
        <Tabs.Root
          value={statusFilter}
          onValueChange={(e) => setStatusFilter(e.value as StatusFilter)}
          variant="line"
          size="sm"
        >
          <Tabs.List>
            <Tabs.Trigger value="all">All</Tabs.Trigger>
            <Tabs.Trigger value="active">Active</Tabs.Trigger>
            <Tabs.Trigger value="inactive">Inactive</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
        <HStack gap={2} ml="auto">
          <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />

          {/* Desktop: inline input */}
          <Input
            display={{ base: 'none', md: 'flex' }}
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
            w="220px"
          />

          {/* Mobile: icon button → popover */}
          <Popover.Root positioning={{ placement: 'bottom-end' }}>
            <Popover.Trigger asChild>
              <IconButton
                display={{ base: 'flex', md: 'none' }}
                size="sm"
                variant={search ? 'solid' : 'outline'}
                colorPalette={search ? 'blue' : 'gray'}
                aria-label="Search"
              >
                <Search size={16} />
              </IconButton>
            </Popover.Trigger>
            <Popover.Positioner>
              <Popover.Content w="240px">
                <Popover.Body p={2}>
                  <Input
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="sm"
                    autoFocus
                  />
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Popover.Root>
        </HStack>
      </Flex>

      {(isLoading || (isFetching && allProducts.length === 0)) ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <Grid
          templateColumns={{
            base: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(auto-fill, minmax(180px, 1fr))',
          }}
          gap={3}
        >
          {products.map((p) => (
            <ProductCard
              key={String(p.id)}
              p={p}
              categoryName={categoryName(p.categoryId)}
              margin={marginPct(p.priceCents, p.cogsCents)}
              togglePending={togglingId === p.id}
              onToggle={() => toggleMutation.mutate(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
          {products.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8} gridColumn="1/-1">No products found.</Text>
          )}
        </Grid>
      )}

      {!isLoading && allProducts.length < total && (
        <Flex justify="center" mt={4}>
          <Button size="sm" variant="outline" loading={isFetching} onClick={() => setPage((p) => p + 1)}>
            Load more
          </Button>
        </Flex>
      )}
      {!isLoading && (
        <Text fontSize="xs" color="gray.400" textAlign="center" mt={2}>
          {products.length} shown{total > allProducts.length ? ` of ${total} total` : ''}
        </Text>
      )}

      {/* Product delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Categories management dialog */}
      <Dialog.Root open={catOpen} onOpenChange={(d) => { if (!d.open) setCatOpen(false) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Categories</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={1} mb={4}>
                {categories.map((c) => (
                  <HStack key={String(c.id)} justify="space-between" px={2} py={1.5} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                    <Text fontSize="sm">{c.name}</Text>
                    <HStack gap={1}>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label="Rename"
                        onClick={() => { setCatEditTarget(c); setCatName(c.name); setCatFormMode('edit'); setCatFormOpen(true) }}
                      >
                        <Pencil size={12} />
                      </IconButton>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        aria-label="Delete"
                        onClick={() => setCatDeleteTarget(c)}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </HStack>
                  </HStack>
                ))}
                {categories.length === 0 && (
                  <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>No categories yet.</Text>
                )}
              </VStack>
              <Button
                size="sm"
                colorPalette="blue"
                width="full"
                onClick={() => { setCatFormMode('add'); setCatName(''); setCatFormOpen(true) }}
              >
                <Plus size={14} /> Add Category
              </Button>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Add / Rename category dialog */}
      <Dialog.Root open={catFormOpen} onOpenChange={(d) => { if (!d.open) setCatFormOpen(false) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="360px">
            <Dialog.Header>
              <Dialog.Title>{catFormMode === 'add' ? 'Add Category' : 'Rename Category'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="cat-form" onSubmit={(e) => {
                e.preventDefault()
                catFormMode === 'add' ? createCatMutation.mutate() : renameCatMutation.mutate()
              }}>
                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input value={catName} onChange={(e) => setCatName(e.target.value)} autoFocus />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setCatFormOpen(false)}>Cancel</Button>
              <Button
                form="cat-form"
                type="submit"
                colorPalette="blue"
                loading={createCatMutation.isPending || renameCatMutation.isPending}
              >
                {catFormMode === 'add' ? 'Create' : 'Save'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Category delete confirm */}
      <ConfirmDialog
        open={!!catDeleteTarget}
        title="Delete Category"
        description={<>Delete <strong>{catDeleteTarget?.name}</strong>? Products in this category will be uncategorized.</>}
        loading={deleteCatMutation.isPending}
        onConfirm={() => catDeleteTarget && deleteCatMutation.mutate(catDeleteTarget.id)}
        onCancel={() => setCatDeleteTarget(null)}
      />
    </Box>
  )
}
