import { useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Box, Button, Drawer, Field, Flex, Grid, Heading, HStack, Input, Separator, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { productClient, settingsClient, tableClient, transactionClient } from '../client'
import type { Product } from '../gen/wargapos/product/v1/product_pb'
import { OrderFrom, PaymentMethod } from '../gen/wargapos/transaction/v1/transaction_pb'
import { formatPrice } from '../lib/format'
import { stripError } from '../lib/errors'
import { POSProductCard } from '../components/shared/POSProductCard'
import { ProductFilter } from '../components/shared/ProductFilter'
import { syncCartToServer } from '../lib/syncCart'
import { useAuthStore } from '../store/auth'

function generateId(): string {
  return crypto.randomUUID()
}

interface CartItem {
  productId: bigint
  name: string
  priceCents: bigint
  qty: number
  notes: string
}

type Step = 'browse' | 'success' | 'pending_payment'
type CartView = 'items' | 'payment'

export function MenuPage() {
  const search = useSearch({ strict: false }) as { table?: string }
  const tableUuid = search.table ?? ''

  const sessionIdRef = useRef<string>(generateId())
  const sessionId = sessionIdRef.current
  const { userId } = useAuthStore()

  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [cartView, setCartView] = useState<CartView>('items')
  const [step, setStep] = useState<Step>('browse')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successCart, setSuccessCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<bigint>(0n)

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['menu-products'],
    queryFn: () => productClient.listProducts({ page: 1, pageSize: 100, categoryId: 0n, activeOnly: true }),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })

  const { data: tableData } = useQuery({
    queryKey: ['table-by-uuid', tableUuid],
    queryFn: () => tableClient.getTable({ uuid: tableUuid }),
    enabled: !!tableUuid,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsClient.getSettings({}),
  })
  const midtransEnabled = settingsData?.midtransConfigured ?? false

  const tableId: bigint = tableData?.table?.id ?? 0n
  const tableName = tableData?.table?.name ?? tableUuid

  const products = (productsData?.products ?? []).filter((p) => p.isActive && p.stockQty > 0)
  const categories = categoriesData?.categories ?? []
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 0n || p.categoryId === selectedCategory
    const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalCents = cart.reduce((sum, i) => sum + i.priceCents * BigInt(i.qty), 0n)

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { productId: product.id, name: product.name, priceCents: product.priceCents, qty: 1, notes: '' }]
    })
  }

  function removeFromCart(productId: bigint) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => i.productId === productId ? { ...i, qty: i.qty - 1 } : i)
    })
  }

  function updateNotes(productId: bigint, notes: string) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, notes } : i))
  }

  async function handleCashCheckout() {
    if (!customerName.trim()) { setNameError(true); return }
    setNameError(false)
    setSubmitting(true)
    setError(null)
    try {
      await syncCartToServer(sessionId, tableId, cart.map((i) => ({ productId: i.productId, qty: i.qty, notes: i.notes })))
      await transactionClient.checkout({
        sessionId,
        cashierId: userId ? BigInt(userId) : 0n,
        paymentMethod: PaymentMethod.CASH,
        orderFrom: OrderFrom.GUEST,
        customerName,
        phoneNumber,
      })
      setSuccessCart([...cart])
      setCart([])
      setStep('success')
      setCartOpen(false)
    } catch (err) {
      const msg = stripError(err)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOnlinePayment() {
    if (!customerName.trim()) { setNameError(true); return }
    setNameError(false)
    setSubmitting(true)
    setError(null)
    try {
      await syncCartToServer(sessionId, tableId, cart.map((i) => ({ productId: i.productId, qty: i.qty, notes: i.notes })))
      const cartRes = await transactionClient.getCart({ sessionId })
      const res = await transactionClient.createPaymentToken({ orderId: cartRes.cart?.id ?? 0n })
      ;(window as any).snap.pay(res.snapToken, {
        onSuccess: () => {
          setSuccessCart([...cart])
          setCart([])
          setStep('success')
          setCartOpen(false)
        },
        onPending: () => { setStep('pending_payment'); setCartOpen(false) },
        onError: (e: any) => { setError(String(e?.message ?? 'Payment failed')) },
        onClose: () => {},
      })
    } catch (err) {
      const msg = stripError(err)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    const successTotal = successCart.reduce((s, i) => s + i.priceCents * BigInt(i.qty), 0n)
    return (
      <Box minH="100svh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" p={6}>
        <Box bg="white" borderRadius="xl" p={8} maxW="400px" w="full" boxShadow="md">
          <Text fontSize="3xl" textAlign="center" mb={2}>✅</Text>
          <Heading size="md" textAlign="center" mb={1}>Order Placed!</Heading>
          {tableId !== 0n && (
            <Text textAlign="center" color="gray.500" fontSize="sm" mb={1}>
              Table: {tableName}
            </Text>
          )}
          {customerName && (
            <Text textAlign="center" color="gray.600" fontSize="sm" fontWeight="medium" mb={0.5}>
              {customerName}
            </Text>
          )}
          {phoneNumber && (
            <Text textAlign="center" color="gray.500" fontSize="xs" mb={4}>{phoneNumber}</Text>
          )}
          <Separator mb={4} />
          <VStack align="stretch" gap={2} mb={4}>
            {successCart.map((item) => (
              <Box key={String(item.productId)}>
                <HStack justify="space-between">
                  <Text fontSize="sm">{item.name} × {item.qty}</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatPrice(item.priceCents * BigInt(item.qty))}
                  </Text>
                </HStack>
                {item.notes && (
                  <Text fontSize="xs" color="gray.400" pl={2}>↳ {item.notes}</Text>
                )}
              </Box>
            ))}
          </VStack>
          <Separator mb={3} />
          <HStack justify="space-between" mb={4}>
            <Text fontWeight="bold">Total</Text>
            <Text fontWeight="bold">{formatPrice(successTotal)}</Text>
          </HStack>
          <Text textAlign="center" color="gray.500" fontSize="xs">
            Please wait — your order is being prepared.
          </Text>
        </Box>
      </Box>
    )
  }

  if (step === 'pending_payment') {
    return (
      <Box minH="100svh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" p={6}>
        <Box bg="white" borderRadius="xl" p={8} maxW="380px" w="full" textAlign="center" boxShadow="md">
          <Text fontSize="4xl" mb={3}>⏳</Text>
          <Heading size="md" mb={2}>Payment Pending</Heading>
          <Text color="gray.500" fontSize="sm">
            Your payment is being processed. Your order will be confirmed shortly.
          </Text>
        </Box>
      </Box>
    )
  }

  // ── Cart drawer — items panel ───────────────────────────────────────────────
  const itemsPanel = (
    <>
      <VStack flex={1} p={4} align="stretch" gap={3} overflow="auto">
        {cart.length === 0 && (
          <Text color="gray.400" fontSize="sm" textAlign="center" mt={8}>Your cart is empty</Text>
        )}
        {cart.map((item) => (
          <Box key={String(item.productId)}>
            <HStack justify="space-between">
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="medium">{item.name}</Text>
                <Text fontSize="xs" color="gray.500">{formatPrice(item.priceCents)}</Text>
              </Box>
              <HStack gap={1}>
                <Button size="xs" variant="outline" onClick={() => removeFromCart(item.productId)}>-</Button>
                <Text fontSize="sm" w={6} textAlign="center">{item.qty}</Text>
                <Button size="xs" variant="outline" onClick={() => addToCart({ id: item.productId, name: item.name, priceCents: item.priceCents } as unknown as Product)}>+</Button>
              </HStack>
            </HStack>
            <Input
              size="xs"
              placeholder="Notes (e.g. no onions)"
              value={item.notes}
              onChange={(e) => updateNotes(item.productId, e.target.value)}
              mt={1}
            />
          </Box>
        ))}
      </VStack>

      <Box p={4} borderTop="1px solid" borderColor="gray.100">
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="bold">Total</Text>
          <Text fontWeight="bold" fontSize="lg">{formatPrice(totalCents)}</Text>
        </HStack>
        <Button
          width="full"
          colorPalette="blue"
          disabled={cart.length === 0}
          onClick={() => setCartView('payment')}
        >
          Proceed to Payment →
        </Button>
      </Box>
    </>
  )

  // ── Cart drawer — payment panel ─────────────────────────────────────────────
  const paymentPanel = (
    <>
      <VStack flex={1} p={4} align="stretch" gap={2} overflow="auto">
        <HStack mb={1}>
          <Button size="xs" variant="ghost" onClick={() => setCartView('items')}>← Back</Button>
          <Text fontWeight="semibold" fontSize="sm">Order Summary</Text>
        </HStack>

        {cart.map((item) => (
          <Box key={String(item.productId)}>
            <HStack justify="space-between">
              <Text fontSize="sm">{item.name} × {item.qty}</Text>
              <Text fontSize="sm" fontWeight="medium">
                {formatPrice(item.priceCents * BigInt(item.qty))}
              </Text>
            </HStack>
            {item.notes && (
              <Text fontSize="xs" color="gray.400" pl={2}>↳ {item.notes}</Text>
            )}
          </Box>
        ))}

        <Separator my={2} />

        <Field.Root invalid={nameError}>
          <Field.Label fontSize="sm" fontWeight="medium">
            Your Name <Text as="span" color="red.500">*</Text>
          </Field.Label>
          <Input
            size="sm"
            placeholder="e.g. Budi"
            value={customerName}
            onChange={(e) => { setCustomerName(e.target.value); if (nameError) setNameError(false) }}
          />
          <Field.ErrorText>Name is required</Field.ErrorText>
        </Field.Root>
        <Box>
          <Text fontSize="sm" mb={1} fontWeight="medium">Phone Number <Text as="span" color="gray.400" fontWeight="normal">(optional)</Text></Text>
          <Input
            size="sm"
            type="tel"
            placeholder="e.g. 0812xxxx"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </Box>
      </VStack>

      <Box p={4} borderTop="1px solid" borderColor="gray.100">
        <HStack justify="space-between" mb={4}>
          <Text fontWeight="bold">Total</Text>
          <Text fontWeight="bold" fontSize="lg">{formatPrice(totalCents)}</Text>
        </HStack>
        {error && (
          <Alert.Root status="error" borderRadius="md" mb={3}>
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{error}</Alert.Description>
          </Alert.Root>
        )}
        <VStack gap={3}>
          <Button
            width="full"
            variant="outline"
            disabled={submitting}
            loading={submitting}
            onClick={handleCashCheckout}
          >
            Pay at Cashier
          </Button>
          {midtransEnabled && (
            <Button
              width="full"
              colorPalette="blue"
              disabled={submitting}
              loading={submitting}
              onClick={handleOnlinePayment}
            >
              Pay Online
            </Button>
          )}
        </VStack>
      </Box>
    </>
  )

  // ── Main browse view ────────────────────────────────────────────────────────
  return (
    <Box minH="100svh" bg="gray.50">
      {/* Header */}
      <Box bg="white" boxShadow="sm" px={4} py={3} position="sticky" top={0} zIndex={10}>
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontWeight="bold" fontSize="md" color="gray.800">WargaPOS</Text>
            {tableId !== 0n && (
              <Text fontSize="xs" color="gray.500">Table: {tableName}</Text>
            )}
          </Box>
        </Flex>
      </Box>

      {/* Filter button */}
      <Box px={{ base: 3, md: 6 }} pt={4} pb={2}>
        <ProductFilter
          categories={categories}
          categoryId={selectedCategory}
          search={searchQuery}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onReset={() => { setSelectedCategory(0n); setSearchQuery('') }}
        />
      </Box>

      {/* Product Grid */}
      <Box px={{ base: 3, md: 6 }} pb={{ base: '90px', md: 6 }}>
        {productsLoading ? (
          <Flex justify="center" mt={12}><Spinner /></Flex>
        ) : (
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(auto-fill, minmax(160px, 1fr))' }} gap={3}>
            {filteredProducts.map((p) => (
              <POSProductCard
                key={String(p.id)}
                name={p.name}
                imageUrl={p.imageUrl}
                priceCents={p.priceCents}
                categoryName={categoryMap.get(p.categoryId)}
                qtyInCart={cart.find((i) => i.productId === p.id)?.qty}
                onClick={() => addToCart(p)}
              />
            ))}
            {filteredProducts.length === 0 && !productsLoading && (
              <Text color="gray.400" fontSize="sm" gridColumn="1/-1">No items found.</Text>
            )}
          </Grid>
        )}
      </Box>

      {/* Floating cart button */}
      {cart.length > 0 && (
        <Box position="fixed" bottom={4} left={4} right={4} zIndex={50}>
          <Button width="full" colorPalette="blue" size="lg" onClick={() => setCartOpen(true)}>
            View Order ({cart.reduce((s, i) => s + i.qty, 0)} items) · {formatPrice(totalCents)}
          </Button>
        </Box>
      )}

      {/* Cart Drawer */}
      <Drawer.Root
        placement="bottom"
        open={cartOpen}
        onOpenChange={(d) => {
          setCartOpen(d.open)
          if (!d.open) setCartView('items')
        }}
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content borderTopRadius="xl" maxH="80vh" display="flex" flexDirection="column">
            <Drawer.Header borderBottomWidth="1px">
              <Drawer.Title>Your Order</Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            {cartView === 'items' ? itemsPanel : paymentPanel}
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Box>
  )
}
