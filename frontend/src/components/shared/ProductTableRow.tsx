import { Button, Flex, Table, Text } from '@chakra-ui/react'
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

export function ProductTableRow({ p, categoryName, margin, togglePending, onToggle, onDelete }: Props) {
  return (
    <Table.Row>
      <Table.Cell>
        <Link to="/products/$id" params={{ id: String(p.id) }}>
          <Flex align="center" gap={2}>
            <ProductImage src={p.imageUrl} size={36} radius={4} />
            <Text fontWeight="medium">{p.name}</Text>
          </Flex>
        </Link>
      </Table.Cell>
      <Table.Cell color="gray.500" fontSize="sm">{p.sku}</Table.Cell>
      <Table.Cell color="gray.500" fontSize="sm">{categoryName || '—'}</Table.Cell>
      <Table.Cell>{formatPrice(p.priceCents)}</Table.Cell>
      <Table.Cell color="green.600" fontSize="sm">{margin ?? '—'}</Table.Cell>
      <Table.Cell>
        <Button
          size="xs"
          variant="outline"
          colorPalette={p.isActive ? 'green' : 'gray'}
          loading={togglePending}
          onClick={onToggle}
        >
          {p.isActive ? 'Active' : 'Inactive'}
        </Button>
      </Table.Cell>
      <Table.Cell>
        <Flex gap={1} justify="flex-end">
          <Button asChild size="xs" variant="ghost">
            <Link to="/products/$id/edit" params={{ id: String(p.id) }}><Pencil size={14} /></Link>
          </Button>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </Flex>
      </Table.Cell>
    </Table.Row>
  )
}
