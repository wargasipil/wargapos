import { Box, Text } from '@chakra-ui/react'
import { ProductImage } from './ProductImage'
import { formatPrice } from '../../lib/format'

interface Props {
  name: string
  imageUrl?: string
  priceCents: bigint
  categoryName?: string
  qtyInCart?: number
  onClick: () => void
}

export function MenuProductCard({ name, imageUrl, priceCents, categoryName, qtyInCart, onClick }: Props) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      cursor="pointer"
      transition="all 0.15s"
      _active={{ opacity: 0.85 }}
      onClick={onClick}
      position="relative"
    >
      {(qtyInCart ?? 0) > 0 && (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg="blue.500"
          color="white"
          borderRadius="full"
          w={5}
          h={5}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="10px"
          fontWeight="bold"
          zIndex={1}
        >
          {qtyInCart}
        </Box>
      )}
      <ProductImage src={imageUrl} />
      <Box p={3}>
        <Text fontWeight="semibold" fontSize="sm" mb={0.5} lineClamp={2}>{name}</Text>
        {categoryName && <Text fontSize="xs" color="gray.400" mb={1}>{categoryName}</Text>}
        <Text fontWeight="bold" color="blue.600" fontSize="sm">{formatPrice(priceCents)}</Text>
      </Box>
    </Box>
  )
}
