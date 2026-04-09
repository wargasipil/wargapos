import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Input, Spinner, Table, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { MarketplaceShopType } from '../../../gen/wargapos/marketplace/v1/shop_pb'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import { useDebounce } from '../../../lib/useDebounce'

const PAGE_SIZE = 20

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

const PLATFORM_TABS = [
  { label: 'All',       value: 0 },
  { label: 'Shopee',    value: MarketplaceShopType.SHOPEE },
  { label: 'Tokopedia', value: MarketplaceShopType.TOKOPEDIA },
  { label: 'Lazada',    value: MarketplaceShopType.LAZADA },
  { label: 'Other',     value: MarketplaceShopType.OTHER },
]

export function ShopListingPage() {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [typeFilter, setTypeFilter] = useState(0)
  const [activeOnly, setActiveOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [togglingIds, setTogglingIds] = useState<Set<bigint>>(new Set())

  function resetPage() { setPage(1) }

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-shops', page, debouncedSearch, activeOnly],
    queryFn: () => marketplaceClient.listShops({ page, pageSize: PAGE_SIZE, search: debouncedSearch, activeOnly }),
    staleTime: 0,
  })

  const allShops = data?.shops ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // client-side platform filter
  const shops = typeFilter === 0 ? allShops : allShops.filter((s) => s.type === typeFilter)

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: bigint; isActive: boolean }) => {
      setTogglingIds((prev) => new Set(prev).add(id))
      return marketplaceClient.updateShop({ id, isActive } as Parameters<typeof marketplaceClient.updateShop>[0])
    },
    onSettled: (_r, _e, { id }) =>
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(id); return s }),
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

      {/* Platform tabs */}
      <Tabs.Root
        value={String(typeFilter)}
        onValueChange={(d) => { setTypeFilter(Number(d.value)); resetPage() }}
        mb={4}
        size="sm"
      >
        <Tabs.List>
          {PLATFORM_TABS.map((t) => (
            <Tabs.Trigger key={t.value} value={String(t.value)}>{t.label}</Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {/* Filter bar */}
      <HStack mb={4} gap={2} wrap="wrap">
        <Input
          size="sm"
          maxW="220px"
          placeholder="Search shop…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage() }}
        />
        <Button
          size="sm"
          variant={activeOnly ? 'solid' : 'outline'}
          colorPalette="green"
          onClick={() => { setActiveOnly((v) => !v); resetPage() }}
        >
          Active only
        </Button>
      </HStack>

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : shops.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={2} color="gray.400">
          <Text>No shops found</Text>
          {allShops.length === 0 && total === 0 && (
            <Button asChild size="sm" variant="outline" mt={2}>
              <Link to="/marketplace/shop/new">Add your first shop</Link>
            </Button>
          )}
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
                  <Table.ColumnHeader>URL</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {shops.map((s) => (
                  <Table.Row key={String(s.id)}>
                    <Table.Cell>
                      <Link to="/marketplace/shop/$id" params={{ id: String(s.id) }}>
                        <Text fontWeight="medium" color="blue.600" _hover={{ textDecoration: 'underline' }}>
                          {s.name}
                        </Text>
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={SHOP_TYPE_COLORS[s.type] ?? 'gray'}>
                        {SHOP_TYPE_LABELS[s.type] ?? 'Unknown'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell color="gray.600">{s.username || '—'}</Table.Cell>
                    <Table.Cell maxW="200px">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--chakra-colors-blue-500)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.url} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <Text color="gray.300" fontSize="xs">—</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette={s.isActive ? 'green' : 'gray'}
                        loading={togglingIds.has(s.id)}
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
                    <Link to="/marketplace/shop/$id" params={{ id: String(s.id) }}>
                      <Text fontWeight="semibold" fontSize="sm" color="blue.600">{s.name}</Text>
                    </Link>
                    <Badge colorPalette={SHOP_TYPE_COLORS[s.type] ?? 'gray'} size="sm">
                      {SHOP_TYPE_LABELS[s.type] ?? 'Unknown'}
                    </Badge>
                  </VStack>
                  <Button
                    size="2xs"
                    variant="outline"
                    colorPalette={s.isActive ? 'green' : 'gray'}
                    loading={togglingIds.has(s.id)}
                    onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Button>
                </Flex>
                {s.username && (
                  <Text fontSize="sm" color="gray.500" mb={1}>@{s.username}</Text>
                )}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: 'var(--chakra-colors-blue-400)', display: 'block', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {s.url}
                  </a>
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

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <HStack mt={4} justify="center" gap={3}>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
              <Text fontSize="sm" color="gray.500">{page} / {totalPages}</Text>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</Button>
            </HStack>
          )}
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
