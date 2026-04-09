import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Box, Button, Flex, Heading, HStack, Input, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { marketplaceOrderClient } from '../../../client'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import { formatDateTime } from '../../../lib/format'

export function MarketplaceCustomersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-customers', search, page],
    queryFn: () => marketplaceOrderClient.listCustomers({ page, pageSize: 20, search }),
    staleTime: 0,
  })

  const customers = data?.customers ?? []
  const total = data?.total ?? 0

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => marketplaceOrderClient.deleteCustomer({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-customers'] })
      toaster.create({ title: 'Customer deleted', type: 'success', duration: 2000 })
      setDeleteTarget(null)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={5} gap={3} flexWrap="wrap">
        <Heading size="md">Customers</Heading>
        <Button asChild colorPalette="blue" size="sm">
          <Link to="/marketplace/customers/new"><Plus size={16} /> New Customer</Link>
        </Button>
      </Flex>

      <Input
        placeholder="Search by name..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        mb={4}
        size="sm"
        maxW="300px"
      />

      {isLoading ? (
        <Flex justify="center" py={12}><Spinner /></Flex>
      ) : customers.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={2} color="gray.400">
          <Text>No customers yet</Text>
          <Button asChild size="sm" variant="outline" mt={2}>
            <Link to="/marketplace/customers/new">Add your first customer</Link>
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
                  <Table.ColumnHeader>Phone</Table.ColumnHeader>
                  <Table.ColumnHeader>Created</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {customers.map((c) => (
                  <Table.Row
                    key={String(c.id)}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => navigate({ to: '/marketplace/customers/$id', params: { id: String(c.id) } })}
                  >
                    <Table.Cell fontWeight="medium">{c.name}</Table.Cell>
                    <Table.Cell color="gray.600">{c.phoneNumber || '—'}</Table.Cell>
                    <Table.Cell color="gray.500" fontSize="xs">{formatDateTime(c.createdAt)}</Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Flex gap={1} justify="flex-end">
                        <Button asChild size="xs" variant="ghost">
                          <Link to="/marketplace/customers/$id/edit" params={{ id: String(c.id) }}>
                            <Pencil size={14} />
                          </Link>
                        </Button>
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(c.id)}>
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
            {customers.map((c) => (
              <Box
                key={String(c.id)}
                bg="white"
                borderRadius="lg"
                p={4}
                boxShadow="sm"
                cursor="pointer"
                onClick={() => navigate({ to: '/marketplace/customers/$id', params: { id: String(c.id) } })}
              >
                <Flex justify="space-between" align="flex-start" mb={1}>
                  <Text fontWeight="semibold" fontSize="sm">{c.name}</Text>
                </Flex>
                <Text fontSize="xs" color="gray.500" mb={3}>{c.phoneNumber || '—'}</Text>
                <Flex gap={2} onClick={(e) => e.stopPropagation()}>
                  <Button asChild size="xs" variant="outline" flex={1}>
                    <Link to="/marketplace/customers/$id/edit" params={{ id: String(c.id) }}>
                      <Pencil size={13} /> Edit
                    </Link>
                  </Button>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteTarget(c.id)}>
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
              <Button size="sm" variant="outline" disabled={customers.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </HStack>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Customer"
        description="This customer will be permanently deleted."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget !== null && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
