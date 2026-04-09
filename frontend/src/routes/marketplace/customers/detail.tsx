import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  Badge, Box, Button, Flex, Heading, HStack, Input, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { ArrowLeft, Pencil, Plus, Trash2, X, Check } from 'lucide-react'
import { marketplaceOrderClient } from '../../../client'
import { MarketplaceOrderStatus } from '../../../gen/wargapos/marketplace/v1/order_pb'
import { formatPrice, formatDateTime } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import type { CustomerAddress } from '../../../gen/wargapos/marketplace/v1/customer_pb'

function statusBadge(status: MarketplaceOrderStatus) {
  if (status === MarketplaceOrderStatus.PENDING)   return <Badge colorPalette="yellow" size="sm">Pending</Badge>
  if (status === MarketplaceOrderStatus.CANCELLED) return <Badge colorPalette="red" size="sm">Cancelled</Badge>
  return <Badge colorPalette="gray" size="sm">Unknown</Badge>
}

type AddrForm = { label: string; address: string; city: string; province: string; postalCode: string }
const emptyAddrForm = (): AddrForm => ({ label: '', address: '', city: '', province: '', postalCode: '' })

function AddrRow({
  addr,
  onUpdated,
  onDeleted,
}: {
  addr: CustomerAddress
  onUpdated: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<AddrForm>({
    label: addr.label,
    address: addr.address,
    city: addr.city,
    province: addr.province,
    postalCode: addr.postalCode,
  })
  const [deleteOpen, setDeleteOpen] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () =>
      marketplaceOrderClient.updateCustomerAddress({
        id: addr.id,
        label: form.label,
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
      }),
    onSuccess: () => {
      setEditing(false)
      onUpdated()
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => marketplaceOrderClient.deleteCustomerAddress({ id: addr.id }),
    onSuccess: () => {
      setDeleteOpen(false)
      onDeleted()
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  if (editing) {
    return (
      <Box borderWidth={1} borderColor="blue.200" borderRadius="md" p={3} bg="blue.50">
        <VStack gap={2} align="stretch">
          <Input
            size="sm"
            placeholder="Label (e.g. Home)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Input
            size="sm"
            placeholder="Address *"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <HStack gap={2}>
            <Input
              size="sm"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              size="sm"
              placeholder="Province"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </HStack>
          <Input
            size="sm"
            placeholder="Postal Code"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          />
          <HStack gap={2} justify="flex-end">
            <Button size="xs" variant="ghost" onClick={() => setEditing(false)} disabled={updateMutation.isPending}>
              <X size={12} /> Cancel
            </Button>
            <Button
              size="xs"
              colorPalette="blue"
              onClick={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
              disabled={!form.address.trim()}
            >
              <Check size={12} /> Save
            </Button>
          </HStack>
        </VStack>
      </Box>
    )
  }

  return (
    <Box borderWidth={1} borderColor="gray.100" borderRadius="md" p={3}>
      <HStack justify="space-between" align="flex-start">
        <VStack align="stretch" gap={0} flex={1}>
          {addr.label && <Text fontSize="xs" fontWeight="semibold" color="blue.600">{addr.label}</Text>}
          <Text fontSize="sm">{addr.address}</Text>
          {(addr.city || addr.province || addr.postalCode) && (
            <Text fontSize="xs" color="gray.500">
              {[addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ')}
            </Text>
          )}
        </VStack>
        <HStack gap={1} flexShrink={0}>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil size={12} />
          </Button>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={12} />
          </Button>
        </HStack>
      </HStack>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Address"
        description="Remove this address? This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </Box>
  )
}

export function MarketplaceCustomerDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [addAddrOpen, setAddAddrOpen] = useState(false)
  const [addrForm, setAddrForm] = useState<AddrForm>(emptyAddrForm())

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['marketplace-customer', id],
    queryFn: () => marketplaceOrderClient.getCustomer({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['marketplace-orders-customer', id],
    queryFn: () => marketplaceOrderClient.listOrders({ page: 1, pageSize: 100, customerId: BigInt(id) }),
    enabled: !!id,
  })

  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['customer-addresses', id],
    queryFn: () => marketplaceOrderClient.listCustomerAddresses({ customerId: BigInt(id) }),
    enabled: !!id,
  })

  const createAddrMutation = useMutation({
    mutationFn: () =>
      marketplaceOrderClient.createCustomerAddress({
        customerId: BigInt(id),
        label: addrForm.label,
        address: addrForm.address,
        city: addrForm.city,
        province: addrForm.province,
        postalCode: addrForm.postalCode,
      }),
    onSuccess: async () => {
      await refetchAddresses()
      setAddrForm(emptyAddrForm())
      setAddAddrOpen(false)
      toaster.create({ title: 'Address added', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  if (customerLoading) return <Flex justify="center" mt={12}><Spinner /></Flex>

  const c = customerData?.customer
  if (!c) return <Text p={6} color="gray.400">Customer not found.</Text>

  const orders = ordersData?.orders ?? []
  const addresses = addressesData?.addresses ?? []

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={5} gap={3}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/customers"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md" flex={1}>{c.name}</Heading>
        <Button asChild size="sm" variant="outline">
          <Link to="/marketplace/customers/$id/edit" params={{ id }}>
            <Pencil size={14} /> Edit
          </Link>
        </Button>
      </HStack>

      <VStack gap={4} align="stretch">
        {/* Info card */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
          <VStack gap={2} align="stretch">
            <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
              <Text fontSize="sm" color="gray.500">Phone</Text>
              <Text fontSize="sm" fontWeight="medium">{c.phoneNumber || '—'}</Text>
            </Flex>
            <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
              <Text fontSize="sm" color="gray.500">Created</Text>
              <Text fontSize="sm" fontWeight="medium">{formatDateTime(c.createdAt as Timestamp | undefined)}</Text>
            </Flex>
            <Flex justify="space-between" pb={2}>
              <Text fontSize="sm" color="gray.500">Updated</Text>
              <Text fontSize="sm" fontWeight="medium">{formatDateTime(c.updatedAt as Timestamp | undefined)}</Text>
            </Flex>
          </VStack>
        </Box>

        {/* Addresses card */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="medium" fontSize="sm">Addresses</Text>
            <Button size="xs" variant="outline" onClick={() => setAddAddrOpen(true)}>
              <Plus size={12} /> Add
            </Button>
          </HStack>

          {/* Add address inline form */}
          {addAddrOpen && (
            <Box borderWidth={1} borderColor="blue.200" borderRadius="md" p={3} bg="blue.50" mb={3}>
              <VStack gap={2} align="stretch">
                <Input
                  size="sm"
                  placeholder="Label (e.g. Home)"
                  value={addrForm.label}
                  onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                />
                <Input
                  size="sm"
                  placeholder="Address *"
                  value={addrForm.address}
                  onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })}
                />
                <HStack gap={2}>
                  <Input
                    size="sm"
                    placeholder="City"
                    value={addrForm.city}
                    onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  />
                  <Input
                    size="sm"
                    placeholder="Province"
                    value={addrForm.province}
                    onChange={(e) => setAddrForm({ ...addrForm, province: e.target.value })}
                  />
                </HStack>
                <Input
                  size="sm"
                  placeholder="Postal Code"
                  value={addrForm.postalCode}
                  onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                />
                <HStack gap={2} justify="flex-end">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => { setAddAddrOpen(false); setAddrForm(emptyAddrForm()) }}
                    disabled={createAddrMutation.isPending}
                  >
                    <X size={12} /> Cancel
                  </Button>
                  <Button
                    size="xs"
                    colorPalette="blue"
                    onClick={() => createAddrMutation.mutate()}
                    loading={createAddrMutation.isPending}
                    disabled={!addrForm.address.trim()}
                  >
                    <Check size={12} /> Save
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )}

          {addresses.length === 0 && !addAddrOpen ? (
            <Text fontSize="sm" color="gray.400">No addresses yet.</Text>
          ) : (
            <VStack gap={2} align="stretch">
              {addresses.map((addr) => (
                <AddrRow
                  key={String(addr.id)}
                  addr={addr}
                  onUpdated={() => qc.invalidateQueries({ queryKey: ['customer-addresses', id] })}
                  onDeleted={() => qc.invalidateQueries({ queryKey: ['customer-addresses', id] })}
                />
              ))}
            </VStack>
          )}
        </Box>

        {/* Order history */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
          <Text fontWeight="medium" fontSize="sm" mb={3}>Order History</Text>
          {ordersLoading ? (
            <Flex justify="center" py={6}><Spinner size="sm" /></Flex>
          ) : orders.length === 0 ? (
            <Text fontSize="sm" color="gray.400">No orders yet.</Text>
          ) : (
            <>
              {/* Desktop table */}
              <Box display={{ base: 'none', md: 'block' }}>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>#</Table.ColumnHeader>
                      <Table.ColumnHeader>Shop</Table.ColumnHeader>
                      <Table.ColumnHeader>Total</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                      <Table.ColumnHeader>Date</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {orders.map((o) => (
                      <Table.Row
                        key={String(o.id)}
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => navigate({ to: '/marketplace/orders/$id', params: { id: String(o.id) } })}
                      >
                        <Table.Cell color="gray.500" fontSize="xs">#{String(o.id)}</Table.Cell>
                        <Table.Cell color="gray.600" fontSize="sm">{o.shopName || '—'}</Table.Cell>
                        <Table.Cell>{formatPrice(BigInt(o.totalCents))}</Table.Cell>
                        <Table.Cell>{statusBadge(o.status)}</Table.Cell>
                        <Table.Cell color="gray.500" fontSize="xs">{formatDateTime(o.createdAt)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Mobile cards */}
              <VStack display={{ base: 'flex', md: 'none' }} gap={2} align="stretch">
                {orders.map((o) => (
                  <Box
                    key={String(o.id)}
                    borderWidth={1}
                    borderColor="gray.100"
                    borderRadius="md"
                    p={3}
                    cursor="pointer"
                    onClick={() => navigate({ to: '/marketplace/orders/$id', params: { id: String(o.id) } })}
                  >
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" color="gray.500">#{String(o.id)}</Text>
                      {statusBadge(o.status)}
                    </Flex>
                    <Text fontSize="sm" fontWeight="medium">{formatPrice(BigInt(o.totalCents))}</Text>
                    <Text fontSize="xs" color="gray.400">{formatDateTime(o.createdAt)}</Text>
                  </Box>
                ))}
              </VStack>
            </>
          )}
        </Box>
      </VStack>
    </Box>
  )
}
