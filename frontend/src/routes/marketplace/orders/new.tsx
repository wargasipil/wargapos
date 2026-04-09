import { Fragment, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Box, Button, Circle, Dialog, Field, Flex, Grid, GridItem,
  Heading, HStack, Input, Portal, Spinner, Table, Text, Textarea, VStack,
} from '@chakra-ui/react'
import { ArrowLeft, Check, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { marketplaceClient, marketplaceOrderClient, stockClient } from '../../../client'
import { WarehouseSelect } from '../../../components/shared/WarehouseSelect'
import { CustomerSelect } from '../../../components/shared/CustomerSelect'
import { ShopSelect } from '../../../components/shared/ShopSelect'
import { formatPrice } from '../../../lib/format'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'
import { useDebounce } from '../../../lib/useDebounce'

interface LineItem {
  itemName: string
  quantity: string
  unitPriceCents: string
}

function blankItem(name = '', priceCents = ''): LineItem {
  return { itemName: name, quantity: '1', unitPriceCents: priceCents }
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

// Step order: Customer → Shipping → Order Info (Shop+Warehouse) → Items → Receipt
const STEPS = ['Customer', 'Shipping', 'Order Info', 'Items', 'Receipt']

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
  const [items, setItems] = useState<LineItem[]>([])

  // wizard
  const [step, setStep] = useState(0)

  // quick-create customer dialog
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // quick-create address dialog
  const [addrDialogOpen, setAddrDialogOpen] = useState(false)
  const [addrForm, setAddrForm] = useState<AddrForm>(blankAddrForm())

  // item picker dialog
  const [itemPickerOpen, setItemPickerOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const debouncedItemSearch = useDebounce(itemSearch, 300)
  const itemSearchRef = useRef<HTMLInputElement>(null)

  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['customer-addresses', String(customerId)],
    queryFn: () => marketplaceOrderClient.listCustomerAddresses({ customerId }),
    enabled: customerId > 0n,
  })
  const addresses = addressesData?.addresses ?? []

  const { data: shopsData } = useQuery({
    queryKey: ['marketplace-shops-all'],
    queryFn: () => marketplaceClient.listShops({ page: 1, pageSize: 100, search: '', activeOnly: true }),
    staleTime: 5 * 60 * 1000,
  })
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => stockClient.listWarehouse({ page: 1, pageSize: 100, search: '' }),
  })
  const shopLabel = shopsData?.shops.find((s) => s.id === shopId)?.name ?? ''
  const warehouseLabel = warehousesData?.warehouses.find((w) => w.id === warehouseId)?.name ?? ''

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['marketplace-products-picker', debouncedItemSearch],
    queryFn: () => marketplaceClient.listProducts({ page: 1, pageSize: 50, search: debouncedItemSearch, activeOnly: true }),
    enabled: itemPickerOpen,
    staleTime: 60_000,
  })
  const pickerProducts = productsData?.products ?? []

  const total = items.reduce((sum, it) => {
    const qty = parseInt(it.quantity, 10)
    const price = parseInt(it.unitPriceCents, 10)
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price >= 0) return sum + qty * price
    return sum
  }, 0)

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it))
  }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)) }
  function addBlankItem() { setItems((prev) => [...prev, blankItem()]) }

  // In picker: qty controls per product name
  function pickerQty(name: string): number {
    const it = items.find((x) => x.itemName === name)
    return it ? parseInt(it.quantity, 10) || 0 : 0
  }
  function pickerIncrement(name: string, priceCents: bigint) {
    const idx = items.findIndex((x) => x.itemName === name)
    if (idx >= 0) {
      setItems((prev) => prev.map((it, i) =>
        i === idx ? { ...it, quantity: String(parseInt(it.quantity, 10) + 1) } : it
      ))
    } else {
      setItems((prev) => [...prev, blankItem(name, String(priceCents))])
    }
  }
  function pickerDecrement(name: string) {
    const idx = items.findIndex((x) => x.itemName === name)
    if (idx < 0) return
    const cur = parseInt(items[idx].quantity, 10)
    if (cur <= 1) {
      setItems((prev) => prev.filter((_, i) => i !== idx))
    } else {
      setItems((prev) => prev.map((it, i) =>
        i === idx ? { ...it, quantity: String(cur - 1) } : it
      ))
    }
  }

  const hasAddress = customerId > 0n ? addressId > 0n : shippingAddress.trim() !== ''

  function stepDone(i: number): boolean {
    if (i === 0) return customerName.trim() !== ''
    if (i === 1) return hasAddress
    if (i === 2) return shopId > 0n && warehouseId > 0
    if (i === 3) return items.length > 0 && items.every(
      (it) => it.itemName.trim() !== '' && parseInt(it.quantity, 10) >= 1 && parseInt(it.unitPriceCents, 10) >= 0
    )
    return true
  }

  const canNext = stepDone(step)
  const canSubmit = [0, 1, 2, 3].every(stepDone)

  const createOrderMutation = useMutation({
    mutationFn: () =>
      marketplaceOrderClient.createOrder({
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
          unitPriceCents: BigInt(it.unitPriceCents || '0'),
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
    mutationFn: () => marketplaceOrderClient.createCustomer({ name: newName, phoneNumber: newPhone }),
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
      marketplaceOrderClient.createCustomerAddress({
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
    <Box p={6}>
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/orders"><ArrowLeft size={16} /></Link>
        </Button>
        <Heading size="md">New Order</Heading>
      </HStack>

      {/* Desktop two-column */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 360px' }} gap={6} alignItems="start">

        {/* LEFT — step form */}
        <GridItem>

          {/* Step indicator */}
          <HStack gap={0} mb={6}>
            {STEPS.map((label, i) => {
              const done = stepDone(i)
              const active = step === i
              const unlocked = i === 0 || Array.from({ length: i }, (_, k) => k).every(stepDone)
              return (
                <Fragment key={i}>
                  <VStack
                    gap={1}
                    cursor={unlocked ? 'pointer' : 'not-allowed'}
                    opacity={!unlocked ? 0.4 : 1}
                    onClick={() => { if (unlocked) setStep(i) }}
                    minW="64px"
                    align="center"
                  >
                    <Circle
                      size="30px"
                      bg={done ? 'green.500' : active ? 'blue.500' : 'gray.200'}
                      color="white"
                      fontSize="sm"
                    >
                      {done ? <Check size={14} /> : i + 1}
                    </Circle>
                    <Text fontSize="xs" color={active ? 'blue.600' : 'gray.400'} textAlign="center">{label}</Text>
                  </VStack>
                  {i < STEPS.length - 1 && (
                    <Box h="1px" bg={stepDone(i) ? 'green.200' : 'gray.200'} flex={1} mt="-14px" />
                  )}
                </Fragment>
              )
            })}
          </HStack>

          {/* Step content card */}
          <Box bg="white" borderRadius="lg" p={6} boxShadow="sm" mb={4}>

            {/* Step 0 — Customer */}
            {step === 0 && (
              <VStack gap={5} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="sm">Customer</Heading>
                  <Button size="sm" variant="outline" onClick={() => setCustomerDialogOpen(true)}>
                    <Plus size={14} /> New Customer
                  </Button>
                </Flex>
                <Field.Root>
                  <Field.Label>Search existing customer</Field.Label>
                  <CustomerSelect value={customerId} onChange={(id, name, phone) => {
                    setCustomerId(id); setCustomerName(name); setPhoneNumber(phone); setAddressId(0n)
                  }} w="100%" />
                </Field.Root>
                <Grid templateColumns="1fr 1fr" gap={4}>
                  <Field.Root required>
                    <Field.Label>Customer Name</Field.Label>
                    <Input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerId(0n) }} placeholder="Customer name" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Phone Number</Field.Label>
                    <Input value={phoneNumber} onChange={(e) => { setPhoneNumber(e.target.value); setCustomerId(0n) }} placeholder="e.g. 08123456789" />
                  </Field.Root>
                </Grid>
              </VStack>
            )}

            {/* Step 1 — Shipping */}
            {step === 1 && (
              <VStack gap={5} align="stretch">
                {customerId > 0n ? (
                  <>
                    <Flex justify="space-between" align="center">
                      <Heading size="sm">Shipping Address</Heading>
                      <Button size="sm" variant="outline" onClick={() => setAddrDialogOpen(true)}>
                        <Plus size={14} /> New Address
                      </Button>
                    </Flex>
                    {addresses.length === 0 ? (
                      <Box p={5} bg="gray.50" borderRadius="md" textAlign="center">
                        <Text fontSize="sm" color="gray.400">No addresses — click "+ New Address" to add one</Text>
                      </Box>
                    ) : (
                      <Grid templateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={3}>
                        {addresses.map((a) => (
                          <Box
                            key={String(a.id)}
                            p={4}
                            borderRadius="md"
                            border="2px solid"
                            borderColor={addressId === a.id ? 'blue.400' : 'gray.200'}
                            bg={addressId === a.id ? 'blue.50' : 'white'}
                            cursor="pointer"
                            onClick={() => setAddressId(a.id)}
                          >
                            {a.label && <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>{a.label}</Text>}
                            <Text fontSize="sm">{a.address}</Text>
                            {(a.city || a.province) && (
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {[a.city, a.province, a.postalCode].filter(Boolean).join(', ')}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Grid>
                    )}
                  </>
                ) : (
                  <>
                    <Heading size="sm">Shipping Address</Heading>
                    <Grid templateColumns="1fr 1fr" gap={4}>
                      <Field.Root>
                        <Field.Label>Label (optional)</Field.Label>
                        <Input value={shippingLabel} onChange={(e) => setShippingLabel(e.target.value)} placeholder="e.g. Home" />
                      </Field.Root>
                      <Field.Root required>
                        <Field.Label>Address</Field.Label>
                        <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street address" />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>City</Field.Label>
                        <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="City" />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Postal Code</Field.Label>
                        <Input value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} placeholder="12345" />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Province</Field.Label>
                        <Input value={shippingProvince} onChange={(e) => setShippingProvince(e.target.value)} placeholder="Province" />
                      </Field.Root>
                    </Grid>
                  </>
                )}
              </VStack>
            )}

            {/* Step 2 — Order Info */}
            {step === 2 && (
              <VStack gap={5} align="stretch">
                <Heading size="sm">Order Info</Heading>
                <Grid templateColumns="1fr 1fr" gap={4}>
                  <Field.Root required>
                    <Field.Label>Shop</Field.Label>
                    <ShopSelect value={shopId} onChange={setShopId} w="100%" />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>Warehouse</Field.Label>
                    <WarehouseSelect value={warehouseId} onChange={setWarehouseId} w="100%" />
                  </Field.Root>
                </Grid>
              </VStack>
            )}

            {/* Step 3 — Items */}
            {step === 3 && (
              <VStack gap={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="sm">Items</Heading>
                  <HStack gap={2}>
                    <Button size="sm" variant="outline" onClick={addBlankItem}>
                      <Plus size={14} /> Add Blank
                    </Button>
                    <Button size="sm" colorPalette="blue" variant="outline" onClick={() => {
                      setItemSearch('')
                      setItemPickerOpen(true)
                      setTimeout(() => itemSearchRef.current?.focus(), 80)
                    }}>
                      <Search size={14} /> Pick Product
                    </Button>
                  </HStack>
                </Flex>

                {/* Sticky items summary (always visible when items exist) */}
                {items.length > 0 && (
                  <Box bg="blue.50" borderRadius="md" p={3} fontSize="sm">
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="medium" color="blue.700">{items.length} item{items.length !== 1 ? 's' : ''} in cart</Text>
                      <Text fontWeight="bold" color="blue.700">{formatPrice(BigInt(total))}</Text>
                    </HStack>
                    <HStack gap={2} flexWrap="wrap">
                      {items.map((it, i) => (
                        <Text key={i} fontSize="xs" bg="white" px={2} py={0.5} borderRadius="full" color="gray.600">
                          {it.itemName || '—'} ×{it.quantity}
                        </Text>
                      ))}
                    </HStack>
                  </Box>
                )}

                {items.length === 0 ? (
                  <Box p={8} bg="gray.50" borderRadius="md" textAlign="center">
                    <Text fontSize="sm" color="gray.400" mb={3}>No items yet</Text>
                    <Button size="sm" colorPalette="blue" onClick={() => {
                      setItemSearch('')
                      setItemPickerOpen(true)
                      setTimeout(() => itemSearchRef.current?.focus(), 80)
                    }}>
                      <Search size={14} /> Pick Product
                    </Button>
                  </Box>
                ) : (
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Item Name</Table.ColumnHeader>
                        <Table.ColumnHeader w="90px" textAlign="center">Qty</Table.ColumnHeader>
                        <Table.ColumnHeader w="160px">Unit Price (IDR)</Table.ColumnHeader>
                        <Table.ColumnHeader w="130px" textAlign="right">Subtotal</Table.ColumnHeader>
                        <Table.ColumnHeader w="40px" />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {items.map((it, idx) => {
                        const qty = parseInt(it.quantity, 10)
                        const price = parseInt(it.unitPriceCents, 10)
                        const subtotal = !isNaN(qty) && !isNaN(price) ? qty * price : 0
                        return (
                          <Table.Row key={idx}>
                            <Table.Cell>
                              <Input size="sm" value={it.itemName} onChange={(e) => updateItem(idx, 'itemName', e.target.value)} placeholder="Item name" />
                            </Table.Cell>
                            <Table.Cell>
                              <Input size="sm" type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} textAlign="center" />
                            </Table.Cell>
                            <Table.Cell>
                              <Input size="sm" type="number" min={0} value={it.unitPriceCents} onChange={(e) => updateItem(idx, 'unitPriceCents', e.target.value)} placeholder="0" />
                            </Table.Cell>
                            <Table.Cell textAlign="right" fontSize="sm" fontWeight="medium">
                              {formatPrice(BigInt(subtotal))}
                            </Table.Cell>
                            <Table.Cell>
                              <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removeItem(idx)}>
                                <Trash2 size={14} />
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
                    </Table.Body>
                  </Table.Root>
                )}

                {items.length > 0 && (
                  <Flex justify="flex-end" pt={3} borderTop="1px solid" borderColor="gray.100" gap={3} align="center">
                    <Text fontSize="sm" color="gray.500">Total:</Text>
                    <Text fontWeight="bold" fontSize="lg" color="blue.600">{formatPrice(BigInt(total))}</Text>
                  </Flex>
                )}
              </VStack>
            )}

            {/* Step 4 — Receipt & Note */}
            {step === 4 && (
              <VStack gap={5} align="stretch">
                <Heading size="sm">Receipt & Note <Text as="span" fontSize="sm" fontWeight="normal" color="gray.400">(optional)</Text></Heading>
                <Field.Root>
                  <Field.Label>Note</Field.Label>
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order note…" />
                </Field.Root>
                <Grid templateColumns="1fr 1fr" gap={4}>
                  <Field.Root>
                    <Field.Label>Receipt #</Field.Label>
                    <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="e.g. INV-001" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Receipt File URL</Field.Label>
                    <Input value={receiptFile} onChange={(e) => setReceiptFile(e.target.value)} placeholder="https://…" />
                  </Field.Root>
                </Grid>
              </VStack>
            )}

          </Box>

          {/* Navigation */}
          <Flex justify="space-between" align="center">
            {step === 0 ? (
              <Button asChild variant="ghost">
                <Link to="/marketplace/orders">Cancel</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                ‹ Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button colorPalette="blue" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Next ›
              </Button>
            ) : (
              <Button colorPalette="blue" size="lg" loading={createOrderMutation.isPending} disabled={!canSubmit} onClick={() => createOrderMutation.mutate()}>
                Create Order
              </Button>
            )}
          </Flex>
        </GridItem>

        {/* RIGHT — sticky order summary */}
        <GridItem display={{ base: 'none', lg: 'block' }}>
          <Box bg="white" borderRadius="lg" p={5} boxShadow="sm" position="sticky" top={6}>
            <Heading size="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={4}>Order Summary</Heading>
            <VStack align="stretch" gap={3} fontSize="sm">

              <HStack justify="space-between">
                <Text color="gray.500">Customer</Text>
                <Text fontWeight="medium" textAlign="right" maxW="180px" truncate>
                  {customerName || '—'}
                </Text>
              </HStack>
              {phoneNumber && (
                <HStack justify="space-between">
                  <Text color="gray.500">Phone</Text>
                  <Text>{phoneNumber}</Text>
                </HStack>
              )}

              <Box h="1px" bg="gray.100" />

              <HStack justify="space-between">
                <Text color="gray.500">Shop</Text>
                <Text fontWeight="medium">{shopLabel || '—'}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">Warehouse</Text>
                <Text fontWeight="medium">{warehouseLabel || '—'}</Text>
              </HStack>

              <Box h="1px" bg="gray.100" />

              {items.length === 0 ? (
                <Text color="gray.300" fontSize="xs" textAlign="center">No items yet</Text>
              ) : (
                <VStack align="stretch" gap={2}>
                  {items.map((it, i) => {
                    const qty = parseInt(it.quantity, 10) || 0
                    const price = parseInt(it.unitPriceCents, 10) || 0
                    return (
                      <HStack key={i} justify="space-between" align="flex-start">
                        <VStack align="start" gap={0} flex={1} minW={0}>
                          <Text truncate maxW="160px">{it.itemName || '—'}</Text>
                          <Text fontSize="xs" color="gray.400">×{qty}</Text>
                        </VStack>
                        <Text flexShrink={0} fontWeight="medium">{formatPrice(BigInt(qty * price))}</Text>
                      </HStack>
                    )
                  })}
                </VStack>
              )}

              <Box h="1px" bg="gray.200" />
              <HStack justify="space-between">
                <Text fontWeight="semibold">Total</Text>
                <Text fontWeight="bold" fontSize="lg" color="blue.600">{formatPrice(BigInt(total))}</Text>
              </HStack>

              {canSubmit && (
                <Button colorPalette="blue" w="full" mt={2} loading={createOrderMutation.isPending} onClick={() => createOrderMutation.mutate()}>
                  Create Order
                </Button>
              )}
            </VStack>
          </Box>
        </GridItem>

      </Grid>

      {/* ── Item picker dialog ── */}
      <Dialog.Root
        open={itemPickerOpen}
        onOpenChange={({ open }) => { if (!open) { setItemPickerOpen(false); setItemSearch('') } }}
        size="lg"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="680px">
              <Dialog.Header>
                <Dialog.Title>Pick Products</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body pb={0}>
                <Input
                  ref={itemSearchRef}
                  placeholder="Search product name…"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  mb={3}
                />
                <Box overflowY="auto" maxH="420px">
                  {productsLoading ? (
                    <Flex justify="center" py={8}><Spinner /></Flex>
                  ) : pickerProducts.length === 0 ? (
                    <Flex justify="center" py={8}><Text color="gray.400">No products found</Text></Flex>
                  ) : (
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Product</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="right" w="120px">Price</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="right" w="70px">Stock</Table.ColumnHeader>
                          <Table.ColumnHeader w="120px" textAlign="center">Qty</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {pickerProducts.map((p) => {
                          const qty = pickerQty(p.name)
                          const warehouseStock = warehouseId > 0
                            ? (p.warehouseStock.find((ws) => ws.warehouseId === warehouseId)?.leftStock ?? p.leftStock)
                            : p.leftStock
                          return (
                            <Table.Row key={String(p.id)} _hover={{ bg: 'gray.50' }}>
                              <Table.Cell fontWeight="medium">{p.name}</Table.Cell>
                              <Table.Cell textAlign="right">{formatPrice(p.priceCents)}</Table.Cell>
                              <Table.Cell textAlign="right">
                                <Text fontSize="xs" color={warehouseStock <= 0 ? 'red.500' : 'gray.500'}>{warehouseStock}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                {qty === 0 ? (
                                  <Flex justify="center">
                                    <Button size="xs" colorPalette="blue" variant="outline" onClick={() => pickerIncrement(p.name, p.priceCents)}>
                                      <Plus size={12} /> Add
                                    </Button>
                                  </Flex>
                                ) : (
                                  <HStack justify="center" gap={1}>
                                    <Button size="xs" variant="outline" onClick={() => pickerDecrement(p.name)}>
                                      <Minus size={12} />
                                    </Button>
                                    <Text w="28px" textAlign="center" fontWeight="semibold">{qty}</Text>
                                    <Button size="xs" variant="outline" colorPalette="blue" onClick={() => pickerIncrement(p.name, p.priceCents)}>
                                      <Plus size={12} />
                                    </Button>
                                  </HStack>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          )
                        })}
                      </Table.Body>
                    </Table.Root>
                  )}
                </Box>
              </Dialog.Body>
              <Dialog.Footer>
                {items.length > 0 && (
                  <Text fontSize="sm" color="gray.500" mr="auto">
                    {items.length} item{items.length !== 1 ? 's' : ''} · {formatPrice(BigInt(total))}
                  </Text>
                )}
                <Button colorPalette="blue" onClick={() => { setItemPickerOpen(false); setItemSearch('') }}>
                  Done
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* ── Quick-create customer dialog ── */}
      <Dialog.Root
        open={customerDialogOpen}
        onOpenChange={({ open }) => { if (!open) { setCustomerDialogOpen(false); setNewName(''); setNewPhone('') } }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="400px">
              <Dialog.Header><Dialog.Title>New Customer</Dialog.Title></Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  <Field.Root required>
                    <Field.Label>Name</Field.Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer name" autoFocus />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Phone Number</Field.Label>
                    <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="e.g. 08123456789" />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
                <Button colorPalette="blue" loading={createCustomerMutation.isPending} disabled={!newName.trim()} onClick={() => createCustomerMutation.mutate()}>
                  Create
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* ── Quick-create address dialog ── */}
      <Dialog.Root
        open={addrDialogOpen}
        onOpenChange={({ open }) => { if (!open) { setAddrDialogOpen(false); setAddrForm(blankAddrForm()) } }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="480px">
              <Dialog.Header><Dialog.Title>New Address</Dialog.Title></Dialog.Header>
              <Dialog.Body>
                <Grid templateColumns="1fr 1fr" gap={4}>
                  <Field.Root>
                    <Field.Label>Label (optional)</Field.Label>
                    <Input value={addrForm.label} onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Home, Office" autoFocus />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>Address</Field.Label>
                    <Input value={addrForm.address} onChange={(e) => setAddrForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>City</Field.Label>
                    <Input value={addrForm.city} onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Postal Code</Field.Label>
                    <Input value={addrForm.postalCode} onChange={(e) => setAddrForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="12345" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Province</Field.Label>
                    <Input value={addrForm.province} onChange={(e) => setAddrForm((f) => ({ ...f, province: e.target.value }))} placeholder="Province" />
                  </Field.Root>
                </Grid>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={() => setAddrDialogOpen(false)}>Cancel</Button>
                <Button colorPalette="blue" loading={createAddressMutation.isPending} disabled={!addrForm.address.trim()} onClick={() => createAddressMutation.mutate()}>
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
