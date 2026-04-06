import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Box, Button, Dialog, Field, Flex, Grid, GridItem, Heading, HStack, Input,
  Portal, Table, Text, Textarea, VStack,
} from '@chakra-ui/react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { WarehouseSelect } from '../../../components/shared/WarehouseSelect'
import { CustomerSelect } from '../../../components/shared/CustomerSelect'
import { ShopSelect } from '../../../components/shared/ShopSelect'
import { formatPrice } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'

interface LineItem {
  itemName: string
  quantity: string
  unitPriceCents: string
}

function blankItem(): LineItem {
  return { itemName: '', quantity: '1', unitPriceCents: '' }
}

interface AddrForm {
  label: string
  address: string
  city: string
  province: string
  postalCode: string
}

function blankAddrForm(): AddrForm {
  return { label: '', address: '', city: '', province: '', postalCode: '' }
}

export function MarketplaceOrderNewPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  // customer
  const [customerId, setCustomerId] = useState(0n)
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [addressId, setAddressId] = useState(0n)

  // order info
  const [warehouseId, setWarehouseId] = useState(0)
  const [shopId, setShopId] = useState(0n)
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState('')
  const [receiptFile, setReceiptFile] = useState('')

  // inline shipping (used when no customer/address selected)
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingProvince, setShippingProvince] = useState('')
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [shippingLabel, setShippingLabel] = useState('')

  // items
  const [items, setItems] = useState<LineItem[]>([blankItem()])

  // quick-create customer dialog
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // quick-create address dialog
  const [addrDialogOpen, setAddrDialogOpen] = useState(false)
  const [addrForm, setAddrForm] = useState<AddrForm>(blankAddrForm())

  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['customer-addresses', String(customerId)],
    queryFn: () => marketplaceClient.listCustomerAddresses({ customerId }),
    enabled: customerId > 0n,
  })
  const addresses = addressesData?.addresses ?? []

  const total = items.reduce((sum, it) => {
    const qty = parseInt(it.quantity, 10)
    const price = parseInt(it.unitPriceCents, 10)
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price >= 0) return sum + qty * price
    return sum
  }, 0)

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it))
  }
  function addItem() { setItems((prev) => [...prev, blankItem()]) }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)) }

  const hasAddress = customerId > 0n ? addressId > 0n : shippingAddress.trim() !== ''
  const canSubmit =
    shopId > 0n &&
    warehouseId > 0 &&
    customerName.trim() !== '' &&
    hasAddress &&
    items.every((it) => it.itemName.trim() !== '' && parseInt(it.quantity, 10) >= 1 && parseInt(it.unitPriceCents, 10) >= 0)

  const createOrderMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.createOrder({
        shopId,
        warehouseId,
        customerId,
        customerName,
        phoneNumber,
        addressId,
        note,
        receipt,
        receiptFile,
        shippingAddress: customerId > 0n ? '' : shippingAddress,
        shippingCity: customerId > 0n ? '' : shippingCity,
        shippingProvince: customerId > 0n ? '' : shippingProvince,
        shippingPostalCode: customerId > 0n ? '' : shippingPostalCode,
        shippingLabel: customerId > 0n ? '' : shippingLabel,
        items: items.map((it) => ({
          itemName: it.itemName,
          quantity: parseInt(it.quantity, 10),
          unitPriceCents: BigInt(it.unitPriceCents),
        })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['marketplace-orders'] })
      toaster.create({ title: 'Order created', type: 'success', duration: 2000 })
      navigate({ to: '/marketplace/orders/$id', params: { id: String(res.order!.id) } })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const createCustomerMutation = useMutation({
    mutationFn: () => marketplaceClient.createCustomer({ name: newName, phoneNumber: newPhone }),
    onSuccess: async (res) => {
      qc.invalidateQueries({ queryKey: ['marketplace-customers'] })
      const c = res.customer!
      setCustomerId(c.id)
      setCustomerName(c.name)
      setPhoneNumber(c.phoneNumber)
      setAddressId(0n)
      setCustomerDialogOpen(false)
      setNewName('')
      setNewPhone('')
      toaster.create({ title: 'Customer created', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const createAddressMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.createCustomerAddress({
        customerId,
        label: addrForm.label,
        address: addrForm.address,
        city: addrForm.city,
        province: addrForm.province,
        postalCode: addrForm.postalCode,
      }),
    onSuccess: async (res) => {
      await refetchAddresses()
      setAddressId(res.address!.id)
      setAddrDialogOpen(false)
      setAddrForm(blankAddrForm())
      toaster.create({ title: 'Address added', type: 'success', duration: 2000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack gap={2} mb={5}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/orders"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md">New Order</Heading>
      </HStack>

      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={5} alignItems="start">

        {/* LEFT column */}
        <GridItem>
          <VStack gap={4} align="stretch">

            {/* Customer card */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontWeight="medium" fontSize="sm">Customer</Text>
                <Button size="2xs" variant="ghost" colorPalette="blue" onClick={() => setCustomerDialogOpen(true)}>
                  <Plus size={12} /> New
                </Button>
              </Flex>
              <VStack gap={3} align="stretch">
                <Field.Root>
                  <Field.Label fontSize="sm">Select existing</Field.Label>
                  <CustomerSelect
                    value={customerId}
                    onChange={(id, name, phone) => {
                      setCustomerId(id)
                      setCustomerName(name)
                      setPhoneNumber(phone)
                      setAddressId(0n)
                    }}
                    w="100%"
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label fontSize="sm">Customer Name</Field.Label>
                  <Input
                    size="sm"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setCustomerId(0n) }}
                    placeholder="Customer name"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Phone Number</Field.Label>
                  <Input
                    size="sm"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setCustomerId(0n) }}
                    placeholder="e.g. 08123456789"
                  />
                </Field.Root>
              </VStack>
            </Box>

            {/* Address card — shown when customer selected */}
            {customerId > 0n && (
              <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="medium" fontSize="sm">Shipping Address</Text>
                  <Button size="2xs" variant="ghost" colorPalette="blue" onClick={() => setAddrDialogOpen(true)}>
                    <Plus size={12} /> New
                  </Button>
                </Flex>
                {addresses.length === 0 ? (
                  <Text fontSize="xs" color="gray.400">No addresses — add one using "+ New"</Text>
                ) : (
                  <VStack gap={2} align="stretch">
                    {addresses.map((a) => (
                      <Box
                        key={String(a.id)}
                        p={2}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={addressId === a.id ? 'blue.400' : 'gray.200'}
                        bg={addressId === a.id ? 'blue.50' : 'white'}
                        cursor="pointer"
                        onClick={() => setAddressId(a.id)}
                        fontSize="sm"
                      >
                        {a.label && <Text fontWeight="medium" fontSize="xs" color="gray.500">{a.label}</Text>}
                        <Text>{a.address}</Text>
                        {(a.city || a.province) && (
                          <Text fontSize="xs" color="gray.500">
                            {[a.city, a.province, a.postalCode].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>
            )}

            {/* Inline shipping — shown when no customer selected */}
            {customerId === 0n && (
              <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Text fontWeight="medium" fontSize="sm" mb={3}>Shipping Address</Text>
                <VStack gap={3} align="stretch">
                  <Field.Root>
                    <Field.Label fontSize="sm">Label (optional)</Field.Label>
                    <Input size="sm" value={shippingLabel} onChange={(e) => setShippingLabel(e.target.value)} placeholder="e.g. Home" />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label fontSize="sm">Address</Field.Label>
                    <Input size="sm" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street address" />
                  </Field.Root>
                  <Grid templateColumns="1fr 1fr" gap={3}>
                    <Field.Root>
                      <Field.Label fontSize="sm">City</Field.Label>
                      <Input size="sm" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="City" />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="sm">Postal Code</Field.Label>
                      <Input size="sm" value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} placeholder="12345" />
                    </Field.Root>
                  </Grid>
                  <Field.Root>
                    <Field.Label fontSize="sm">Province</Field.Label>
                    <Input size="sm" value={shippingProvince} onChange={(e) => setShippingProvince(e.target.value)} placeholder="Province" />
                  </Field.Root>
                </VStack>
              </Box>
            )}

            {/* Order info card */}
            <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
              <Text fontWeight="medium" fontSize="sm" mb={3}>Order Info</Text>
              <VStack gap={3} align="stretch">
                <Field.Root required>
                  <Field.Label fontSize="sm">Shop</Field.Label>
                  <ShopSelect value={shopId} onChange={setShopId} w="100%" />
                </Field.Root>
                <Field.Root required>
                  <Field.Label fontSize="sm">Warehouse</Field.Label>
                  <WarehouseSelect value={warehouseId} onChange={setWarehouseId} w="100%" />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="sm">Note</Field.Label>
                  <Textarea
                    size="sm"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Order note (optional)"
                  />
                </Field.Root>
                <Grid templateColumns="1fr 1fr" gap={3}>
                  <Field.Root>
                    <Field.Label fontSize="sm">Receipt #</Field.Label>
                    <Input size="sm" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="e.g. INV-001" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="sm">Receipt File URL</Field.Label>
                    <Input size="sm" value={receiptFile} onChange={(e) => setReceiptFile(e.target.value)} placeholder="https://…" />
                  </Field.Root>
                </Grid>
              </VStack>
            </Box>

          </VStack>
        </GridItem>

        {/* RIGHT column — Items */}
        <GridItem>
          <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
            <Flex justify="space-between" align="center" mb={3}>
              <Text fontWeight="medium" fontSize="sm">Items</Text>
              <Button size="xs" variant="outline" onClick={addItem}>
                <Plus size={13} /> Add Item
              </Button>
            </Flex>

            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Item Name</Table.ColumnHeader>
                  <Table.ColumnHeader w="70px">Qty</Table.ColumnHeader>
                  <Table.ColumnHeader w="130px">Unit Price (IDR)</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right" w="110px">Subtotal</Table.ColumnHeader>
                  <Table.ColumnHeader w="36px" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((it, i) => {
                  const qty = parseInt(it.quantity, 10)
                  const price = parseInt(it.unitPriceCents, 10)
                  const subtotal = !isNaN(qty) && !isNaN(price) ? qty * price : 0
                  return (
                    <Table.Row key={i}>
                      <Table.Cell>
                        <Input size="xs" value={it.itemName} onChange={(e) => updateItem(i, 'itemName', e.target.value)} placeholder="Item name" />
                      </Table.Cell>
                      <Table.Cell>
                        <Input size="xs" type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                      </Table.Cell>
                      <Table.Cell>
                        <Input size="xs" type="number" min={0} value={it.unitPriceCents} onChange={(e) => updateItem(i, 'unitPriceCents', e.target.value)} placeholder="0" />
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontSize="xs" color="gray.600">
                        {formatPrice(BigInt(subtotal))}
                      </Table.Cell>
                      <Table.Cell>
                        <Button size="2xs" variant="ghost" colorPalette="red" disabled={items.length <= 1} onClick={() => removeItem(i)}>
                          <Trash2 size={13} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>

            <Flex justify="flex-end" mt={3} pt={3} borderTop="1px solid" borderColor="gray.100" gap={2} align="center">
              <Text fontSize="sm" color="gray.500">Total:</Text>
              <Text fontWeight="semibold">{formatPrice(BigInt(total))}</Text>
            </Flex>
          </Box>

          <HStack justify="flex-end" mt={4} gap={2}>
            <Button asChild variant="ghost" size="sm">
              <Link to="/marketplace/orders">Cancel</Link>
            </Button>
            <Button
              colorPalette="blue"
              size="sm"
              loading={createOrderMutation.isPending}
              disabled={!canSubmit}
              onClick={() => createOrderMutation.mutate()}
            >
              Create Order
            </Button>
          </HStack>
        </GridItem>
      </Grid>

      {/* Quick-create customer dialog */}
      <Dialog.Root
        open={customerDialogOpen}
        onOpenChange={({ open }) => { if (!open) { setCustomerDialogOpen(false); setNewName(''); setNewPhone('') } }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="360px">
              <Dialog.Header><Dialog.Title>New Customer</Dialog.Title></Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  <Field.Root required>
                    <Field.Label fontSize="sm">Name</Field.Label>
                    <Input size="sm" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer name" autoFocus />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="sm">Phone Number</Field.Label>
                    <Input size="sm" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="e.g. 08123456789" />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" size="sm" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
                <Button colorPalette="blue" size="sm" loading={createCustomerMutation.isPending} disabled={!newName.trim()} onClick={() => createCustomerMutation.mutate()}>
                  Create
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Quick-create address dialog */}
      <Dialog.Root
        open={addrDialogOpen}
        onOpenChange={({ open }) => { if (!open) { setAddrDialogOpen(false); setAddrForm(blankAddrForm()) } }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="400px">
              <Dialog.Header><Dialog.Title>New Address</Dialog.Title></Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  <Field.Root>
                    <Field.Label fontSize="sm">Label (optional)</Field.Label>
                    <Input size="sm" value={addrForm.label} onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Home, Office" autoFocus />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label fontSize="sm">Address</Field.Label>
                    <Input size="sm" value={addrForm.address} onChange={(e) => setAddrForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="sm">City</Field.Label>
                    <Input size="sm" value={addrForm.city} onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="sm">Province</Field.Label>
                    <Input size="sm" value={addrForm.province} onChange={(e) => setAddrForm((f) => ({ ...f, province: e.target.value }))} placeholder="Province" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="sm">Postal Code</Field.Label>
                    <Input size="sm" value={addrForm.postalCode} onChange={(e) => setAddrForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="12345" />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" size="sm" onClick={() => setAddrDialogOpen(false)}>Cancel</Button>
                <Button colorPalette="blue" size="sm" loading={createAddressMutation.isPending} disabled={!addrForm.address.trim()} onClick={() => createAddressMutation.mutate()}>
                  Save Address
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
