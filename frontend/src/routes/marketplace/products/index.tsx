import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Box, Button, Flex, Heading, HStack, Input, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { formatPrice } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'

export function MarketplaceProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-products', search, page],
    queryFn: () => marketplaceClient.listProducts({ page, pageSize: 20, search }),
    staleTime: 0,
  })

  const products = data?.products ?? []
  const total = data?.total ?? 0

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: bigint; isActive: boolean }) =>
      marketplaceClient.updateProduct({ id, isActive } as Parameters<typeof marketplaceClient.updateProduct>[0]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace-products'] }),
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => marketplaceClient.deleteProduct({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-products'] })
      toaster.create({ title: 'Product deleted', type: 'success', duration: 2000 })
      setDeleteTarget(null)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={5} gap={3} flexWrap="wrap">
        <Heading size="md">Products</Heading>
        <Button asChild colorPalette="blue" size="sm">
          <Link to="/marketplace/products/new"><Plus size={16} /> Add Product</Link>
        </Button>
      </Flex>

      <Flex flex={1} mb={4} position="relative" align="center" maxW="320px">
        <Search size={14} style={{ position: 'absolute', left: 10, color: '#9ca3af' }} />
        <Input
          pl={8}
          size="sm"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </Flex>

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : products.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={2} color="gray.400">
          <Text>No products found</Text>
          <Button asChild size="sm" variant="outline" mt={2}>
            <Link to="/marketplace/products/new">Add your first product</Link>
          </Button>
        </Flex>
      ) : (
        <>
          {/* Desktop table */}
          <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Price</Table.ColumnHeader>
                  <Table.ColumnHeader>Stock</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Valuation</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.map((p) => (
                  <Table.Row key={String(p.id)}>
                    <Table.Cell>
                      <HStack gap={2}>
                        {p.imageUrl && (
                          <img src={p.imageUrl} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                        )}
                        <Text fontWeight="medium">{p.name}</Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>{formatPrice(BigInt(p.priceCents))}</Table.Cell>
                    <Table.Cell>{p.leftStock.toLocaleString('id-ID')}</Table.Cell>
                    <Table.Cell textAlign="right">{p.stockValuation.toLocaleString('id-ID')}</Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette={p.isActive ? 'green' : 'gray'}
                        loading={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap={1} justify="flex-end">
                        <Button asChild size="xs" variant="ghost" colorPalette="blue">
                          <Link to="/marketplace/products/$id" params={{ id: String(p.id) }}>
                            <Eye size={14} /> Detail
                          </Link>
                        </Button>
                        <Button asChild size="xs" variant="ghost">
                          <Link to="/marketplace/products/$id/edit" params={{ id: String(p.id) }}>
                            <Pencil size={14} />
                          </Link>
                        </Button>
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(p.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {/* Mobile cards */}
          <VStack display={{ base: 'flex', md: 'none' }} gap={3} align="stretch">
            {products.map((p) => (
              <Box key={String(p.id)} bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Flex justify="space-between" align="flex-start" mb={2}>
                  <HStack gap={2}>
                    {p.imageUrl && (
                      <img src={p.imageUrl} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    )}
                    <Text fontWeight="semibold" fontSize="sm">{p.name}</Text>
                  </HStack>
                  <Button
                    size="2xs"
                    variant="outline"
                    colorPalette={p.isActive ? 'green' : 'gray'}
                    loading={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Button>
                </Flex>
                <Text fontSize="sm" color="blue.600" fontWeight="medium">
                  {formatPrice(BigInt(p.priceCents))}
                </Text>
                <Text fontSize="xs" color="gray.500">Stock: {p.leftStock.toLocaleString('id-ID')}</Text>
                <Text fontSize="xs" color="gray.500" mb={3}>Valuation: {p.stockValuation.toLocaleString('id-ID')}</Text>
                <Flex gap={2}>
                  <Button asChild size="xs" variant="outline" colorPalette="blue" flex={1}>
                    <Link to="/marketplace/products/$id" params={{ id: String(p.id) }}>
                      <Eye size={13} /> Detail
                    </Link>
                  </Button>
                  <Button asChild size="xs" variant="outline" flex={1}>
                    <Link to="/marketplace/products/$id/edit" params={{ id: String(p.id) }}>
                      <Pencil size={13} /> Edit
                    </Link>
                  </Button>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(p.id)}>
                    <Trash2 size={13} />
                  </Button>
                </Flex>
              </Box>
            ))}
          </VStack>

          {total > 20 && (
            <HStack mt={4} justify="center" gap={3}>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Text fontSize="sm" color="gray.500">Page {page}</Text>
              <Button size="sm" variant="outline" disabled={products.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </HStack>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Product"
        description="This product will be permanently deleted."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget !== null && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
