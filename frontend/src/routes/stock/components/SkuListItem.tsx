import { Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Sku } from '../../../gen/wargapos/stock/v1/sku_pb'

interface Props {
  sku: Sku
  onEdit: (sku: Sku) => void
  onDelete: (sku: Sku) => void
}

export function SkuListItem({ sku, onEdit, onDelete }: Props) {
  return (
    <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
      <Flex align="center" justify="space-between" gap={2}>
        <Box>
          <Text fontWeight="semibold" fontFamily="mono">{sku.code}</Text>
          <HStack gap={3} mt={1}>
            <Text fontSize="xs" color="gray.500">Warehouse #{sku.warehouseId}</Text>
            <Text fontSize="xs" color="gray.500">Stock: {sku.leftStock}</Text>
          </HStack>
        </Box>
        <HStack gap={2}>
          <Button size="xs" variant="outline" colorPalette="gray" asChild>
            <Link to="/stock/skus/$id" params={{ id: String(sku.id) }}>
              <Eye size={12} /> Detail
            </Link>
          </Button>
          <Button size="xs" variant="outline" onClick={() => onEdit(sku)}>
            <Pencil size={12} /> Edit
          </Button>
          <Button size="xs" variant="outline" colorPalette="red" onClick={() => onDelete(sku)}>
            <Trash2 size={12} /> Delete
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}
