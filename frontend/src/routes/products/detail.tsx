import { useQuery } from '@tanstack/react-query'
import {
  Box, Button, Flex, Heading, HStack, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { productClient } from '../../client'
import { formatPrice } from '../../lib/format'

function marginPct(priceCents: bigint, cogsCents: bigint): string | null {
  if (cogsCents === 0n || priceCents === 0n) return null
  const pct = Math.round(Number((priceCents - cogsCents) * 100n / priceCents))
  return `${pct}%`
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
      <Text fontSize="sm" color="gray.500">{label}</Text>
      <Text fontSize="sm" fontWeight="medium">{value}</Text>
    </Flex>
  )
}

export function ProductDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productClient.getProduct({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })
  const categories = catData?.categories ?? []

  if (isLoading) {
    return <Flex justify="center" mt={12}><Spinner /></Flex>
  }

  const p = productData?.product
  if (!p) return <Text p={6}>Product not found.</Text>

  const catName = categories.find((c) => c.id === p.categoryId)?.name ?? ''
  const margin = marginPct(p.priceCents, p.cogsCents)

  return (
    <Box p={{ base: 3, md: 6 }} maxW="560px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/products"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Product Detail</Heading>
        <Button asChild size="sm" variant="outline" ml="auto">
          <Link to="/products/$id/edit" params={{ id }}><Pencil size={14} /> Edit</Link>
        </Button>
      </HStack>

      {p.imageUrl && (
        <img
          src={p.imageUrl}
          style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
        />
      )}

      <VStack align="stretch" gap={3}>
        <DetailRow label="Name" value={p.name} />
        {p.description && <DetailRow label="Description" value={p.description} />}
        {catName && <DetailRow label="Category" value={catName} />}
        {p.sku && <DetailRow label="SKU" value={p.sku} />}
        <DetailRow label="Price" value={formatPrice(p.priceCents)} />
        {p.cogsCents > 0n && <DetailRow label="Cost (COGS)" value={formatPrice(p.cogsCents)} />}
        {margin && <DetailRow label="Gross Margin" value={margin} />}
        <DetailRow label="Status" value={p.isActive ? 'Active' : 'Inactive'} />
      </VStack>
    </Box>
  )
}
