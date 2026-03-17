import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Badge, Box, Button, Dialog, Drawer, Field, Flex, Grid, Heading, HStack, Input, Separator, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Printer } from 'lucide-react'
import { productClient, transactionClient, tableClient } from '../../client'
import { TableSelect } from '../../components/shared/TableSelect'
import { PrinterSettingsDialog } from '../../components/shared/PrinterSettingsDialog'
import { useCartStore } from '../../store/cart'
import { useAuthStore } from '../../store/auth'
import { usePrinterStore } from '../../store/printer'
import { formatPrice, formatTime } from '../../lib/format'
import { stripError } from '../../lib/errors'
import { printReceiptRemote } from '../../lib/printer'
import { POSProductCard } from '../../components/shared/POSProductCard'
import { ProductFilter } from '../../components/shared/ProductFilter'
import { syncCartToServer } from '../../lib/syncCart'
import { toaster } from '../../components/ui/toaster'
import type { Product } from '../../gen/wargapos/product/v1/product_pb'
import { PaymentMethod, OrderFrom } from '../../gen/wargapos/transaction/v1/transaction_pb'
import type { Order } from '../../gen/wargapos/transaction/v1/transaction_pb'

type Step = 'browse' | 'receipt'

export function PosPage() {
  const { items, totalCents, sessionId, addItem, removeItem, clear } = useCartStore()
  const { userId } = useAuthStore()
  const { selectedPrinter } = usePrinterStore()
  const [step, setStep] = useState<Step>('browse')
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [tableId, setTableId] = useState<bigint>(0n)
  const [categoryId, setCategoryId] = useState<bigint>(0n)
  const [search, setSearch] = useState('')
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => productClient.listProducts({ page: 1, pageSize: 200, categoryId: 0n }),
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })

  const { data: tableData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  const tables = tableData?.tables ?? []
  const categories = catData?.categories ?? []
  const selectedTable = tables.find((t) => t.id === tableId)
  const tableLabel = selectedTable ? selectedTable.name : 'Walk-in'

  const allProducts = (data?.products ?? []).filter((p) => p.isActive)
  const products = allProducts.filter((p) => {
    const matchesCategory = categoryId === 0n || p.categoryId === categoryId
    const matchesSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  async function handleCheckout() {
    if (items.length === 0) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      await syncCartToServer(sessionId, tableId, items.map((i) => ({ productId: i.productId, qty: i.qty })))
      const res = await transactionClient.checkout({
        sessionId,
        cashierId: userId ? BigInt(userId) : 0n,
        paymentMethod: PaymentMethod.CASH,
        orderFrom: OrderFrom.POS,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
      })
      clear()
      setTableId(0n)
      setCartOpen(false)
      setCheckoutOpen(false)
      setCustomerName('')
      setPhoneNumber('')
      setReceiptOrder(res.order ?? null)
      setStep('receipt')
    } catch (err) {
      setCheckoutError(stripError(err))
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleAdd(product: Product) {
    addItem({ productId: product.id, name: product.name, unitPriceCents: product.priceCents })
  }

  function handleNewOrder() {
    setReceiptOrder(null)
    setStep('browse')
  }

  async function handlePrint(order: Order, orderTableName: string) {
    if (!selectedPrinter) return
    setPrintLoading(true)
    try {
      await printReceiptRemote(order, orderTableName, selectedPrinter)
    } catch (err) {
      toaster.create({ type: 'error', title: 'Print failed', description: stripError(err) })
    } finally {
      setPrintLoading(false)
    }
  }

  // ── Printer warning banner ────────────────────────────────────────────────────
  const printerWarning = !selectedPrinter ? (
    <Alert.Root status="warning" mb={3}>
      <Alert.Indicator />
      <Alert.Description fontSize="sm">
        No printer selected.{' '}
        <Text as="span" textDecor="underline" cursor="pointer" onClick={() => setPrinterSettingsOpen(true)}>
          Select a printer
        </Text>
      </Alert.Description>
    </Alert.Root>
  ) : null

  // ── Receipt screen ───────────────────────────────────────────────────────────
  if (step === 'receipt' && receiptOrder) {
    const order = receiptOrder
    const orderTable = tables.find((t) => t.id === order.tableId)
    const receiptTotal = order.items.reduce((s, i) => s + i.subtotalCents, 0n)
    const orderTableName = orderTable ? orderTable.name : 'Walk-in'

    return (
      <Box minH="100svh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" p={4}>
        <Box bg="white" borderRadius="xl" boxShadow="md" w="full" maxW="420px">
          {/* Receipt content — also used for print */}
          <Box className="receipt-print" p={6}>
            <Text fontWeight="bold" fontSize="lg" textAlign="center">WargaPOS</Text>
            <Text fontSize="xs" color="gray.500" textAlign="center" mb={4}>Café Point of Sale</Text>

            <HStack justify="space-between" fontSize="sm" mb={1}>
              <Text color="gray.500">Order</Text>
              <Text fontWeight="medium">#{String(order.id)}</Text>
            </HStack>
            <HStack justify="space-between" fontSize="sm" mb={1}>
              <Text color="gray.500">Date</Text>
              <Text>{formatTime(order.createdAt)}</Text>
            </HStack>
            <HStack justify="space-between" fontSize="sm" mb={1}>
              <Text color="gray.500">Table</Text>
              <Text>{orderTableName}</Text>
            </HStack>
            {order.customerName && (
              <HStack justify="space-between" fontSize="sm" mb={1}>
                <Text color="gray.500">Customer</Text>
                <Text>{order.customerName}</Text>
              </HStack>
            )}
            {order.phoneNumber && (
              <HStack justify="space-between" fontSize="sm" mb={1}>
                <Text color="gray.500">Phone</Text>
                <Text>{order.phoneNumber}</Text>
              </HStack>
            )}

            <Separator my={4} />

            <VStack align="stretch" gap={2} mb={4}>
              {order.items.map((item, i) => (
                <HStack key={i} justify="space-between" fontSize="sm">
                  <Box flex={1}>
                    <Text fontWeight="medium">{item.productName}</Text>
                    <Text fontSize="xs" color="gray.500">{formatPrice(item.unitPriceCents)} × {item.quantity}</Text>
                  </Box>
                  <Text fontWeight="medium">{formatPrice(item.subtotalCents)}</Text>
                </HStack>
              ))}
            </VStack>

            <Separator mb={4} />

            <HStack justify="space-between">
              <Text fontWeight="bold" fontSize="md">Total</Text>
              <Text fontWeight="bold" fontSize="xl">{formatPrice(receiptTotal)}</Text>
            </HStack>
          </Box>

          {/* Actions — hidden on print */}
          <Box p={4} borderTop="1px solid" borderColor="gray.100" className="no-print">
            {printerWarning}
            <HStack gap={3}>
              <Button
                flex={1}
                variant="outline"
                loading={printLoading}
                disabled={!selectedPrinter}
                onClick={() => handlePrint(order, orderTableName)}
              >
                <Printer size={16} />
                Print
              </Button>
              <Button flex={1} colorPalette="blue" onClick={handleNewOrder}>
                New Order
              </Button>
            </HStack>
          </Box>
        </Box>

        {/* Print styles */}
        <style>{`
          @media print {
            body > * { display: none !important; }
            .receipt-print { display: block !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        <PrinterSettingsDialog open={printerSettingsOpen} onClose={() => setPrinterSettingsOpen(false)} />
      </Box>
    )
  }

  const cartPanel = (
    <>
      <VStack flex={1} p={4} align="stretch" gap={2} overflow="auto">
        {items.length === 0 && (
          <Text color="gray.400" fontSize="sm" textAlign="center" mt={8}>Tap a product to add it</Text>
        )}
        {items.map((item) => (
          <HStack key={item.productId} justify="space-between">
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium">{item.name}</Text>
              <Text fontSize="xs" color="gray.500">{formatPrice(item.unitPriceCents)} x {item.qty}</Text>
            </Box>
            <HStack gap={1}>
              <Button size="xs" variant="outline" onClick={() => removeItem(item.productId)}>-</Button>
              <Text fontSize="sm" w={6} textAlign="center">{item.qty}</Text>
              <Button size="xs" variant="outline" onClick={() => handleAdd({ id: item.productId, name: item.name, priceCents: item.unitPriceCents } as Product)}>+</Button>
            </HStack>
          </HStack>
        ))}
      </VStack>
      <Box p={4} borderTop="1px solid" borderColor="gray.100">
        <Separator mb={3} />
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="bold">Total</Text>
          <Text fontWeight="bold" fontSize="lg">{formatPrice(totalCents)}</Text>
        </HStack>
        <Button
          width="full"
          colorPalette="blue"
          disabled={items.length === 0}
          onClick={() => { setCheckoutError(null); setCheckoutOpen(true) }}
        >
          Checkout
        </Button>
      </Box>
    </>
  )

  return (
    <Flex h="100%" minH="100svh">
      {/* Product Grid */}
      <Box flex={1} p={{ base: 3, md: 6 }} overflow="auto" pb={{ base: '80px', md: 6 }}>
        <HStack mb={4} gap={3} align="center" wrap="wrap">
          <Heading size="md" flex={1}>Products</Heading>
          <ProductFilter
            categories={categories}
            categoryId={categoryId}
            search={search}
            onCategoryChange={setCategoryId}
            onSearchChange={setSearch}
            onReset={() => { setCategoryId(0n); setSearch('') }}
          />
          <TableSelect
            tables={tables}
            value={tableId}
            onChange={setTableId}
            placeholder="Walk-in"
          />
          {/* Printer button */}
          <Button size="sm" variant="ghost" onClick={() => setPrinterSettingsOpen(true)}>
            <Printer size={16} />
            {selectedPrinter
              ? <Text fontSize="xs" maxW="80px" truncate>{selectedPrinter.name}</Text>
              : <Badge colorPalette="orange" size="sm">!</Badge>
            }
          </Button>
        </HStack>

        {printerWarning}

        {isLoading ? (
          <Flex justify="center" mt={12}><Spinner /></Flex>
        ) : (
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(160px, 1fr))' }} gap={{ base: 3, md: 4 }}>
            {products.map((p) => (
              <POSProductCard
                key={String(p.id)}
                name={p.name}
                imageUrl={p.imageUrl}
                priceCents={p.priceCents}
                stockQty={p.stockQty}
                qtyInCart={items.find((i) => i.productId === p.id)?.qty}
                onClick={() => handleAdd(p)}
              />
            ))}
            {products.length === 0 && (
              <Text color="gray.400" fontSize="sm">No products found.</Text>
            )}
          </Grid>
        )}
      </Box>

      {/* Floating cart button — mobile only */}
      {items.length > 0 && (
        <Box
          display={{ base: 'block', md: 'none' }}
          position="fixed"
          bottom="72px"
          left={4}
          right={4}
          zIndex={50}
        >
          <Button width="full" colorPalette="blue" size="lg" onClick={() => setCartOpen(true)}>
            Cart ({items.length}) · {formatPrice(totalCents)}
          </Button>
        </Box>
      )}

      {/* Cart Drawer — mobile */}
      <Drawer.Root placement="bottom" open={cartOpen} onOpenChange={(d) => setCartOpen(d.open)}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content borderTopRadius="xl" maxH="75vh" display="flex" flexDirection="column">
            <Drawer.Header borderBottomWidth="1px">
              <Box>
                <Drawer.Title>Cart</Drawer.Title>
                <Text fontSize="xs" color="gray.400">{tableLabel}</Text>
              </Box>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            {cartPanel}
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      {/* Cart Panel — desktop only */}
      <Box
        display={{ base: 'none', md: 'flex' }}
        w="320px"
        bg="white"
        borderLeft="1px solid"
        borderColor="gray.200"
        flexDirection="column"
      >
        <Box p={4} borderBottom="1px solid" borderColor="gray.100">
          <Heading size="sm">Cart</Heading>
          <Text fontSize="xs" color="gray.400">{tableLabel}</Text>
        </Box>
        {cartPanel}
      </Box>

      {/* Customer info dialog */}
      <Dialog.Root open={checkoutOpen} onOpenChange={(d) => setCheckoutOpen(d.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Customer Info</Dialog.Title>
              <Text fontSize="xs" color="gray.500">Optional — leave blank for walk-in</Text>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root w="full">
                  <Field.Label>Customer Name</Field.Label>
                  <Input
                    placeholder="e.g. Budi"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </Field.Root>
                <Field.Root w="full">
                  <Field.Label>Phone Number</Field.Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 08123..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </Field.Root>
                {checkoutError && (
                  <Alert.Root status="error" borderRadius="md" w="full">
                    <Alert.Indicator />
                    <Alert.Description fontSize="sm">{checkoutError}</Alert.Description>
                  </Alert.Root>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
              <Button colorPalette="blue" loading={checkoutLoading} onClick={handleCheckout}>
                Confirm Checkout
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Printer settings dialog */}
      <PrinterSettingsDialog open={printerSettingsOpen} onClose={() => setPrinterSettingsOpen(false)} />
    </Flex>
  )
}
