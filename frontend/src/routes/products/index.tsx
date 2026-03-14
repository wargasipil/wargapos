import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Flex, Heading, HStack, Input, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { productClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { formatPrice } from '../../lib/format'
import { stripError } from '../../lib/errors'
import { ProductImage } from '../../components/ProductImage'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { CategorySelect } from '../../components/CategorySelect'
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
    mutationFn: (p: Product) => productClient.updateProduct({
      id: p.id, name: p.name, priceCents: p.priceCents, cogsCents: p.cogsCents,
      isActive: !p.isActive, imageUrl: p.imageUrl,
    }),
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
        <>
          {/* Mobile card list */}
          <VStack display={{ base: 'flex', md: 'none' }} gap={3} align="stretch">
            {products.map((p) => (
              <Box key={String(p.id)} bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Flex justify="space-between" align="start">
                  <Link to={`/products/${p.id}`} style={{ flex: 1, marginRight: 12 }}>
                    <Flex gap={3} align="center">
                      <ProductImage src={p.imageUrl} size={40} radius={6} />
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm">{p.name}</Text>
                        <Text fontSize="xs" color="gray.500">{p.sku}</Text>
                        {categoryName(p.categoryId) && (
                          <Text fontSize="xs" color="teal.600">{categoryName(p.categoryId)}</Text>
                        )}
                        <Text fontWeight="bold" color="blue.600" mt={1} fontSize="sm">{formatPrice(p.priceCents)}</Text>
                        {marginPct(p.priceCents, p.cogsCents) && (
                          <Text fontSize="xs" color="green.600">Margin {marginPct(p.priceCents, p.cogsCents)}</Text>
                        )}
                      </Box>
                    </Flex>
                  </Link>
                  <HStack gap={1}>
                    <Button
                      size="2xs"
                      variant="outline"
                      colorPalette={p.isActive ? 'green' : 'gray'}
                      loading={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(p)}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Button>
                    <Button asChild size="xs" variant="ghost">
                      <Link to={`/products/${p.id}/edit`}><Pencil size={14} /></Link>
                    </Button>
                    <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(p)}>
                      <Trash2 size={14} />
                    </Button>
                  </HStack>
                </Flex>
              </Box>
            ))}
            {products.length === 0 && (
              <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>No products found.</Text>
            )}
          </VStack>

          {/* Desktop table */}
          <Box display={{ base: 'none', md: 'block' }}>
            <Table.Root variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>SKU</Table.ColumnHeader>
                  <Table.ColumnHeader>Category</Table.ColumnHeader>
                  <Table.ColumnHeader>Price</Table.ColumnHeader>
                  <Table.ColumnHeader>Margin</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.map((p) => (
                  <Table.Row key={String(p.id)}>
                    <Table.Cell>
                      <Link to={`/products/${p.id}`}>
                        <Flex align="center" gap={2}>
                          <ProductImage src={p.imageUrl} size={36} radius={4} />
                          <Text fontWeight="medium">{p.name}</Text>
                        </Flex>
                      </Link>
                    </Table.Cell>
                    <Table.Cell color="gray.500" fontSize="sm">{p.sku}</Table.Cell>
                    <Table.Cell color="gray.500" fontSize="sm">{categoryName(p.categoryId) || '—'}</Table.Cell>
                    <Table.Cell>{formatPrice(p.priceCents)}</Table.Cell>
                    <Table.Cell color="green.600" fontSize="sm">{marginPct(p.priceCents, p.cogsCents) ?? '—'}</Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette={p.isActive ? 'green' : 'gray'}
                        loading={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(p)}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap={1} justify="flex-end">
                        <Button asChild size="xs" variant="ghost">
                          <Link to={`/products/${p.id}/edit`}><Pencil size={14} /></Link>
                        </Button>
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(p)}>
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
                {products.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={7} textAlign="center" color="gray.400" py={8}>No products found.</Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </>
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
