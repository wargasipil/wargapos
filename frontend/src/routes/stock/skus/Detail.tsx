import { useQuery } from '@tanstack/react-query'
import {
  Box, Flex, Heading, HStack, Image, Spinner, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { stockClient, productClient, marketplaceClient, ingredientClient } from '../../../client'
import { formatDateTime } from '../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { ProductType } from '../../../gen/wargapos/stock/v1/sku_pb'
import { StockLogTab } from './detail_tabs/StockLogTab'
import { CostVersionTab } from './detail_tabs/CostVersionTab'
import { PlacementTab } from './detail_tabs/PlacementTab'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
      <Text fontSize="sm" color="gray.500">{label}</Text>
      <Text fontSize="sm" fontWeight="medium">{value}</Text>
    </Flex>
  )
}

function productTypeLabel(t: ProductType): string {
  switch (t) {
    case ProductType.MATERIAL: return 'Material'
    case ProductType.CAFE_PRODUCT: return 'Cafe Product'
    case ProductType.MARKETPLACE_PRODUCT: return 'Marketplace Product'
    default: return '—'
  }
}

export function SkuDetail() {
  const { id } = useParams({ strict: false }) as { id: string }
  const skuId = Number(id)

  const { data: skuData, isLoading } = useQuery({
    queryKey: ['sku', id],
    queryFn: () => stockClient.getSku({ identifier: { case: 'id', value: skuId } }),
  })

  const sku = skuData?.sku

  const { data: warehouseData } = useQuery({
    queryKey: ['warehouse', sku?.warehouseId],
    queryFn: () => stockClient.getWarehouse({ ids: [sku!.warehouseId] }),
    enabled: !!sku,
  })

  const { data: cafeProductData } = useQuery({
    queryKey: ['cafe-product', sku?.productId],
    queryFn: () => productClient.getProduct({ id: BigInt(sku!.productId) }),
    enabled: !!sku && sku.productType === ProductType.CAFE_PRODUCT,
  })

  const { data: marketplaceProductData } = useQuery({
    queryKey: ['marketplace-product', sku?.productId],
    queryFn: () => marketplaceClient.getProduct({ id: BigInt(sku!.productId) }),
    enabled: !!sku && sku.productType === ProductType.MARKETPLACE_PRODUCT,
  })

  const { data: materialData } = useQuery({
    queryKey: ['material', sku?.productId],
    queryFn: () => ingredientClient.getMaterial({ id: sku!.productId }),
    enabled: !!sku && sku.productType === ProductType.MATERIAL,
  })

  if (isLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (!sku) return <Text p={6} color="gray.400">SKU not found.</Text>

  const warehouseName = warehouseData?.warehouses[sku.warehouseId]?.name

  const linkedProduct = cafeProductData?.product ?? marketplaceProductData?.product ?? null
  const linkedMaterial = materialData?.material ?? null

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={4} gap={3}>
        <Link to="/stock/skus">
          <ArrowLeft size={18} />
        </Link>
        <Heading size="md" fontFamily="mono">{sku.code}</Heading>
      </HStack>

      <Flex gap={4} align="stretch" direction={{ base: 'column', md: 'row' }} mb={6}>
        {/* Info card */}
        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" flex={1} w="full">
          <VStack gap={2} align="stretch">
            <DetailRow label="Warehouse" value={warehouseName ?? `#${sku.warehouseId}`} />
            <DetailRow label="Product Type" value={productTypeLabel(sku.productType)} />
            <DetailRow label="Left Stock" value={String(sku.leftStock)} />
          <DetailRow label="Stock Valuation" value={'Rp\u00a0' + Math.round(sku.stockValuation).toLocaleString('id-ID')} />
            <DetailRow label="Branch" value={`#${sku.branchId}`} />
            <DetailRow label="Created" value={formatDateTime(sku.createdAt as Timestamp | undefined)} />
            <DetailRow label="Last Stock In" value={formatDateTime(sku.lastStockIn as Timestamp | undefined)} />
            <DetailRow label="Last Adjustment" value={formatDateTime(sku.lastAdjustment as Timestamp | undefined)} />
            <DetailRow label="Last Stock Out" value={formatDateTime(sku.lastStockOut as Timestamp | undefined)} />
          </VStack>
        </Box>

        {/* Linked product / material card */}
        {linkedProduct && (
          <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" flex={1} w="full">
            <Text fontWeight="medium" fontSize="sm" mb={3}>Product</Text>
            {linkedProduct.imageUrl && (
              <Image
                src={linkedProduct.imageUrl}
                alt={linkedProduct.name}
                borderRadius="md"
                mb={3}
                maxH="160px"
                objectFit="cover"
                w="full"
              />
            )}
            <VStack gap={2} align="stretch">
              <DetailRow label="Name" value={linkedProduct.name} />
              {'description' in linkedProduct && (
                <DetailRow label="Description" value={(linkedProduct as { description: string }).description || '—'} />
              )}
              <DetailRow label="Created" value={formatDateTime((linkedProduct as { createdAt?: unknown }).createdAt as Timestamp | undefined)} />
            </VStack>
          </Box>
        )}

        {linkedMaterial && (
          <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" flex={1} w="full">
            <Text fontWeight="medium" fontSize="sm" mb={3}>Material</Text>
            <VStack gap={2} align="stretch">
              <DetailRow label="Name" value={linkedMaterial.name} />
              <DetailRow label="Code" value={linkedMaterial.code} />
              <DetailRow label="Created" value={formatDateTime(linkedMaterial.createdAt as Timestamp | undefined)} />
            </VStack>
          </Box>
        )}
      </Flex>

      {/* Tabs */}
      <Tabs.Root defaultValue="stocklog" variant="line">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="stocklog">Stock Log</Tabs.Trigger>
          <Tabs.Trigger value="priceversion">Price Version</Tabs.Trigger>
          <Tabs.Trigger value="placement">Placement</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="stocklog"><StockLogTab id={id} skuId={skuId} /></Tabs.Content>
        <Tabs.Content value="priceversion"><CostVersionTab id={id} skuId={skuId} /></Tabs.Content>
        <Tabs.Content value="placement"><PlacementTab skuId={skuId} /></Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
