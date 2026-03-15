import { Table, Text } from '@chakra-ui/react'
import type { Category } from '../../gen/wargapos/product/v1/product_pb'

export function CategoryTableRow({ c }: { c: Category }) {
  return (
    <Table.Row>
      <Table.Cell color="gray.400" fontSize="xs">#{String(c.id)}</Table.Cell>
      <Table.Cell><Text fontWeight="medium">{c.name}</Text></Table.Cell>
    </Table.Row>
  )
}
