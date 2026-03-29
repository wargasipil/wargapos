import { Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { ProductImage } from './ProductImage'
import { formatPrice } from '../../lib/format'
import type { Product } from '../../gen/wargapos/product/v1/product_pb'

interface Props {
  p: Product
  categoryName: string
  margin: string | null
  togglePending: boolean
  onToggle: () => void
  onDelete: () => void
}

export function ProductCard({ p, categoryName, margin, togglePending, onToggle, onDelete }: Props) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      display="flex"
      flexDir="column"
    >
      <Link to="/cafe/products/$id" params={{ id: String(p.id) }} style={{ flexShrink: 0 }}>
        <ProductImage src={p.imageUrl} />
      </Link>

      <Box p={3} flex="1">
        <Link to="/cafe/products/$id" params={{ id: String(p.id) }}>
          <Text fontWeight="semibold" fontSize="sm" lineClamp={2} mb={0.5}>{p.name}</Text>
        </Link>
        {p.sku && <Text fontSize="xs" color="gray.400" mb={0.5}>{p.sku}</Text>}
        {categoryName && <Text fontSize="xs" color="teal.600" mb={1}>{categoryName}</Text>}
        <Text fontWeight="bold" color="blue.600" fontSize="sm">{formatPrice(p.priceCents)}</Text>
        {margin && <Text fontSize="xs" color="green.600">Margin {margin}</Text>}
        <Text
          fontSize="xs"
          mt={0.5}
          color={p.stockQty <= 0 ? 'red.500' : p.stockQty <= 5 ? 'orange.500' : 'gray.500'}
        >
          {p.stockQty <= 0 ? 'Out of stock' : `Stock: ${p.stockQty}`}
        </Text>
      </Box>

      <Flex
        px={3} pb={3} pt={1}
        justify="space-between"
        align="center"
        borderTopWidth={1}
        borderColor="gray.100"
      >
        <Button
          size="2xs"
          variant="outline"
          colorPalette={p.isActive ? 'green' : 'gray'}
          loading={togglePending}
          onClick={onToggle}
        >
          {p.isActive ? 'Active' : 'Inactive'}
        </Button>
        <HStack gap={0.5}>
          <Button asChild size="xs" variant="ghost">
            <Link to="/cafe/products/$id/edit" params={{ id: String(p.id) }}><Pencil size={14} /></Link>
          </Button>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}
