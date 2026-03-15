import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Box, Button, Drawer, Flex, Grid, Heading, HStack, NativeSelect, Separator, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { productClient, transactionClient, tableClient } from '../../client'
import { useCartStore } from '../../store/cart'
import { useAuthStore } from '../../store/auth'
import { toaster } from '../../components/ui/toaster'
import { formatPrice } from '../../lib/format'
import { stripError } from '../../lib/errors'
import { POSProductCard } from '../../components/shared/POSProductCard'
import { ProductFilter } from '../../components/shared/ProductFilter'
import { syncCartToServer } from '../../lib/syncCart'
import type { Product } from '../../gen/wargapos/product/v1/product_pb'
import { PaymentMethod, OrderFrom } from '../../gen/wargapos/transaction/v1/transaction_pb'

export function PosPage() {
  const { items, totalCents, sessionId, addItem, removeItem, clear } = useCartStore()
  const { userId } = useAuthStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [tableId, setTableId] = useState<bigint>(0n)
  const [categoryId, setCategoryId] = useState<bigint>(0n)
  const [search, setSearch] = useState('')

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
      })
      clear()
      setTableId(0n)
      setCartOpen(false)
      toaster.create({ title: `Order #${String(res.order?.id)} completed!`, type: 'success', duration: 4000 })
    } catch (err) {
      setCheckoutError(stripError(err))
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleAdd(product: Product) {
    addItem({ productId: product.id, name: product.name, unitPriceCents: product.priceCents })
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
        {checkoutError && (
          <Alert.Root status="error" borderRadius="md" mb={2}>
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{checkoutError}</Alert.Description>
          </Alert.Root>
        )}
        <Button
          width="full"
          colorPalette="blue"
          disabled={items.length === 0}
          loading={checkoutLoading}
          onClick={handleCheckout}
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
          <NativeSelect.Root size="sm" w="160px">
            <NativeSelect.Field
              value={String(tableId)}
              onChange={(e) => setTableId(BigInt(e.target.value))}
            >
              <option value="0">Walk-in</option>
              {tables.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>
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
    </Flex>
  )
}
