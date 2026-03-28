import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Flex, Heading, HStack, Spinner, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { productClient } from '../../client'
import { formatPrice } from '../../lib/format'
import { AdjustStockDialog } from './_components/AdjustStockDialog'
import { StockHistoryTab } from './_components/StockHistoryTab'
import { RecipeTab } from './_components/RecipeTab'

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
  const qc = useQueryClient()
  const [adjustOpen, setAdjustOpen] = useState(false)

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productClient.getProduct({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })

  if (isLoading) {
    return <Flex justify="center" mt={12}><Spinner /></Flex>
  }

  const p = productData?.product
  if (!p) return <Text p={6}>Product not found.</Text>

  const categories = catData?.categories ?? []
  const catName = categories.find((c) => c.id === p.categoryId)?.name ?? ''
  const margin = marginPct(p.priceCents, p.cogsCents)

  return (
    <Box p={{ base: 3, md: 6 }} maxW="600px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/products"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Product Detail</Heading>
        <HStack ml="auto" gap={2}>
          <Button size="sm" colorPalette="blue" onClick={() => setAdjustOpen(true)}>
            Adjust Stock
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/products/$id/edit" params={{ id }}><Pencil size={14} /> Edit</Link>
          </Button>
        </HStack>
      </HStack>

      <Tabs.Root defaultValue="details" variant="line">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="history">Stock History</Tabs.Trigger>
          <Tabs.Trigger value="recipe">Recipe</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="details">
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
            <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
              <Text fontSize="sm" color="gray.500">Stock</Text>
              <Text fontSize="sm" fontWeight="bold" color={p.stockQty > 0 ? 'gray.800' : 'red.500'}>
                {p.stockQty > 0 ? p.stockQty : 'Out of stock'}
              </Text>
            </Flex>
          </VStack>
        </Tabs.Content>

        <Tabs.Content value="history">
          <StockHistoryTab productId={id} />
        </Tabs.Content>

        <Tabs.Content value="recipe">
          <RecipeTab productId={id} />
        </Tabs.Content>
      </Tabs.Root>

      <AdjustStockDialog
        productId={id}
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['product', id] })
          qc.invalidateQueries({ queryKey: ['stock-movements', id] })
          qc.invalidateQueries({ queryKey: ['products'] })
        }}
      />
    </Box>
  )
}
