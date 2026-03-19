import { Box, Text } from '@chakra-ui/react'
import { ProductImage } from './ProductImage'
import { formatPrice } from '../../lib/format'

interface Props {
  name: string
  sku?: string
  imageUrl?: string
  priceCents: bigint
  categoryName?: string
  qtyInCart?: number
  stockQty?: number
  onClick: () => void
}

export function POSProductCard({ name, sku, imageUrl, priceCents, categoryName, qtyInCart, stockQty, onClick }: Props) {
  const inCart = (qtyInCart ?? 0) > 0
  const outOfStock = (stockQty ?? 1) <= 0
  const lowStock = !outOfStock && stockQty !== undefined && stockQty <= 5

  return (
    <Box
      bg="white"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      cursor={outOfStock ? 'not-allowed' : 'pointer'}
      pointerEvents={outOfStock ? 'none' : undefined}
      opacity={outOfStock ? 0.5 : 1}
      transition="all 0.15s"
      _active={outOfStock ? undefined : { opacity: 0.85 }}
      onClick={outOfStock ? undefined : onClick}
      position="relative"
      display="flex"
      flexDir="column"
      outline={!outOfStock && inCart ? '2px solid' : 'none'}
      outlineColor="blue.400"
    >
      {/* Top-right badge: out of stock / low stock / cart qty */}
      {outOfStock ? (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg="red.500"
          color="white"
          borderRadius="full"
          px={2}
          py="1px"
          fontSize="10px"
          fontWeight="bold"
          zIndex={1}
          whiteSpace="nowrap"
        >
          Out of Stock
        </Box>
      ) : lowStock ? (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg="orange.400"
          color="white"
          borderRadius="full"
          px={2}
          py="1px"
          fontSize="10px"
          fontWeight="bold"
          zIndex={1}
          whiteSpace="nowrap"
        >
          {stockQty} left
        </Box>
      ) : inCart ? (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg="blue.500"
          color="white"
          borderRadius="full"
          minW={5}
          h={5}
          px={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="10px"
          fontWeight="bold"
          zIndex={1}
        >
          {qtyInCart}
        </Box>
      ) : null}

      <ProductImage src={imageUrl} />
      <Box p={3} flex="1" display="flex" flexDir="column">
        <Text fontWeight="semibold" fontSize="sm" mb={0.5} lineClamp={2}>{name}</Text>
        {sku && <Text fontSize="xs" color="gray.400" mb={0.5}>{sku}</Text>}
        {categoryName && <Text fontSize="xs" color="gray.400" mb={1}>{categoryName}</Text>}
        <Text fontWeight="bold" color="blue.600" fontSize="sm" mt="auto">{formatPrice(priceCents)}</Text>
      </Box>
    </Box>
  )
}
