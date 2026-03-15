import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Flex, Grid, Heading, HStack, Input, Spinner, Text,
} from '@chakra-ui/react'
import { Package, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { productClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { CategorySelect } from '../../components/shared/CategorySelect'
import { ProductCard } from '../../components/shared/ProductCard'
import type { Product } from '../../gen/wargapos/product/v1/product_pb'

type StatusFilter = 'all' | 'active' | 'inactive'

function marginPct(priceCents: bigint, cogsCents: bigint): string | null {
  if (cogsCents === 0n || priceCents === 0n) return null
  const pct = Math.round(Number((priceCents - cogsCents) * 100n / priceCents))
  return `${pct}%`
}

export function ProductsPage() {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<bigint | null>(null)
  const [categoryId, setCategoryId] = useState<bigint>(0n)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['products', String(categoryId)],
    queryFn: () => productClient.listProducts({ page: 1, pageSize: 100, categoryId }),
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })
  const categories = catData?.categories ?? []

  function categoryName(id: bigint): string {
    return categories.find((c) => c.id === id)?.name ?? ''
  }

  const toggleMutation = useMutation({
    mutationFn: (p: Product) => {
      setTogglingId(p.id)
      return productClient.updateProduct({
        id: p.id, name: p.name, priceCents: p.priceCents, cogsCents: p.cogsCents,
        isActive: !p.isActive, imageUrl: p.imageUrl,
      })
    },
    onSettled: () => setTogglingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => productClient.deleteProduct({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
      toaster.create({ title: 'Product deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const products = (data?.products ?? [])
    .filter((p) => statusFilter === 'all' || (statusFilter === 'active' ? p.isActive : !p.isActive))
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Box p={{ base: 3, md: 6 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><Package size={22} /><Heading size="md">Products</Heading></HStack>
        <Button asChild colorPalette="blue" size="sm" width={{ base: 'full', md: 'auto' }}>
          <Link to="/products/new"><Plus size={16} /> Add Product</Link>
        </Button>
      </Flex>

      {/* Status tabs + Search + Category */}
      <Flex gap={2} mb={4} wrap="wrap" align="center">
        {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'solid' : 'outline'}
            colorPalette={statusFilter === s ? 'blue' : 'gray'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
          </Button>
        ))}
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
          maxW={{ base: 'full', md: '220px' }}
          ml={{ md: 'auto' }}
        />
      </Flex>

      {isLoading ? (
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</>}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
