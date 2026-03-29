import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { MarketplaceShopType } from '../../../gen/wargapos/marketplace/v1/shop_pb'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'

const SHOP_TYPE_LABELS: Record<number, string> = {
  [MarketplaceShopType.SHOPEE]: 'Shopee',
  [MarketplaceShopType.TOKOPEDIA]: 'Tokopedia',
  [MarketplaceShopType.LAZADA]: 'Lazada',
  [MarketplaceShopType.OTHER]: 'Other',
}

const SHOP_TYPE_COLORS: Record<number, string> = {
  [MarketplaceShopType.SHOPEE]: 'orange',
  [MarketplaceShopType.TOKOPEDIA]: 'green',
  [MarketplaceShopType.LAZADA]: 'blue',
  [MarketplaceShopType.OTHER]: 'gray',
}

export function ShopListingPage() {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-shops'],
    queryFn: () => marketplaceClient.listShops({ page: 1, pageSize: 100 }),
    staleTime: 0,
  })

  const shops = data?.shops ?? []

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: bigint; isActive: boolean }) =>
      marketplaceClient.updateShop({ id, isActive } as Parameters<typeof marketplaceClient.updateShop>[0]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace-shops'] }),
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => marketplaceClient.deleteShop({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-shops'] })
      toaster.create({ title: 'Shop deleted', type: 'success', duration: 2000 })
      setDeleteTarget(null)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={5} gap={3} flexWrap="wrap">
        <Heading size="md">Shops</Heading>
        <Button asChild colorPalette="blue" size="sm">
          <Link to="/marketplace/shop/new"><Plus size={16} /> Add Shop</Link>
        </Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : shops.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={2} color="gray.400">
          <Text>No shops yet</Text>
          <Button asChild size="sm" variant="outline" mt={2}>
            <Link to="/marketplace/shop/new">Add your first shop</Link>
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
                  <Table.ColumnHeader>Platform</Table.ColumnHeader>
                  <Table.ColumnHeader>Username</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {shops.map((s) => (
                  <Table.Row key={String(s.id)}>
                    <Table.Cell fontWeight="medium">{s.name}</Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={SHOP_TYPE_COLORS[s.type] ?? 'gray'}>
                        {SHOP_TYPE_LABELS[s.type] ?? 'Unknown'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell color="gray.600">{s.username || '—'}</Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette={s.isActive ? 'green' : 'gray'}
                        loading={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap={1} justify="flex-end">
                        <Button asChild size="xs" variant="ghost">
                          <Link to="/marketplace/shop/$id/edit" params={{ id: String(s.id) }}>
                            <Pencil size={14} />
                          </Link>
                        </Button>
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(s.id)}>
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
            {shops.map((s) => (
              <Box key={String(s.id)} bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Flex justify="space-between" align="flex-start" mb={2}>
                  <VStack align="flex-start" gap={1}>
                    <Text fontWeight="semibold" fontSize="sm">{s.name}</Text>
                    <Badge colorPalette={SHOP_TYPE_COLORS[s.type] ?? 'gray'} size="sm">
                      {SHOP_TYPE_LABELS[s.type] ?? 'Unknown'}
                    </Badge>
                  </VStack>
                  <Button
                    size="2xs"
                    variant="outline"
                    colorPalette={s.isActive ? 'green' : 'gray'}
                    loading={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Button>
                </Flex>
                {s.username && (
                  <Text fontSize="sm" color="gray.500" mb={3}>@{s.username}</Text>
                )}
                <Flex gap={2}>
                  <Button asChild size="xs" variant="outline" flex={1}>
                    <Link to="/marketplace/shop/$id/edit" params={{ id: String(s.id) }}>
                      <Pencil size={13} /> Edit
                    </Link>
                  </Button>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(s.id)}>
                    <Trash2 size={13} />
                  </Button>
                </Flex>
              </Box>
            ))}
          </VStack>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Shop"
        description="This shop will be permanently deleted."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget !== null && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
