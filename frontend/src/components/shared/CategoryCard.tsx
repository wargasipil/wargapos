import { Box, Flex, Text } from '@chakra-ui/react'
import type { Category } from '../../gen/wargapos/product/v1/product_pb'

export function CategoryCard({ c }: { c: Category }) {
  return (
    <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
      <Flex justify="space-between" align="center">
        <Text fontWeight="semibold" fontSize="sm">{c.name}</Text>
        <Text fontSize="xs" color="gray.400">#{String(c.id)}</Text>
      </Flex>
    </Box>
  )
}
