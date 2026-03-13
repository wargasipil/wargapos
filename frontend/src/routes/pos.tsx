import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Button, Flex, Grid, Heading, Spinner, Text, VStack, HStack, Separator,
} from '@chakra-ui/react'
import { productClient, transactionClient } from '../client'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import type { Product } from '../gen/wargapos/product/v1/product_pb'

function formatPrice(cents: bigint): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(cents))
}

export function PosPage() {
  const { items, totalCents, sessionId, addItem, removeItem, clear } = useCartStore()
  const { userId } = useAuthStore()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productClient.listProducts({ page: 1, pageSize: 50, categoryId: '' }),
  })

  async function handleCheckout() {
    if (items.length === 0) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const res = await transactionClient.checkout({
        sessionId,
        cashierId: userId ?? '',
        paymentMethod: 'cash',
      })
      setLastOrderId(res.order?.id ?? null)
      clear()
    } catch (err) {
      setCheckoutError(String(err))
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleAdd(product: Product) {
    addItem({ productId: product.id, name: product.name, unitPriceCents: product.priceCents })
  }

  const products = data?.products ?? []

  return (
    <Flex h="100%" minH="100vh">
      {/* Product Grid */}
      <Box flex={1} p={6} overflow="auto">
        <Heading size="md" mb={4}>Products</Heading>
        {isLoading ? (
          <Flex justify="center" mt={12}><Spinner /></Flex>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={4}>
            {products.map((p) => (
              <Box
                key={p.id}
                bg="white"
                borderRadius="lg"
                p={4}
                boxShadow="sm"
                cursor="pointer"
                _hover={{ boxShadow: 'md', transform: 'translateY(-1px)' }}
                transition="all 0.15s"
                onClick={() => handleAdd(p)}
              >
                <Text fontWeight="semibold" fontSize="sm" mb={1} lineClamp={2}>{p.name}</Text>
                <Text fontSize="xs" color="gray.500" mb={2}>{p.sku}</Text>
                <Text fontWeight="bold" color="blue.600">{formatPrice(p.priceCents)}</Text>
              </Box>
            ))}
            {products.length === 0 && (
              <Text color="gray.400" fontSize="sm">No products found.</Text>
            )}
          </Grid>
        )}
      </Box>

      {/* Cart Panel */}
      <Box w="320px" bg="white" borderLeft="1px solid" borderColor="gray.200" display="flex" flexDirection="column">
        <Box p={4} borderBottom="1px solid" borderColor="gray.100">
          <Heading size="sm">Cart</Heading>
        </Box>

        <VStack flex={1} p={4} align="stretch" gap={2} overflow="auto">
          {items.length === 0 && (
            <Text color="gray.400" fontSize="sm" textAlign="center" mt={8}>
              Tap a product to add it
            </Text>
          )}
          {items.map((item) => (
            <HStack key={item.productId} justify="space-between">
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="medium">{item.name}</Text>
                <Text fontSize="xs" color="gray.500">{formatPrice(item.unitPriceCents)} × {item.qty}</Text>
              </Box>
              <HStack gap={1}>
                <Button size="xs" variant="outline" onClick={() => removeItem(item.productId)}>−</Button>
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
          {checkoutError && <Text color="red.500" fontSize="xs" mb={2}>{checkoutError}</Text>}
          {lastOrderId && (
            <Text color="green.600" fontSize="xs" mb={2}>Order #{lastOrderId.slice(0, 8)} completed!</Text>
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
      </Box>
    </Flex>
  )
}
