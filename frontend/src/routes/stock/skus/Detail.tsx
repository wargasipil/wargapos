import { useQuery } from '@tanstack/react-query'
import {
  Box, Flex, Heading, HStack, Spinner, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { stockClient } from '../../../client'
import { formatDateTime } from '../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { StockLogTab } from './detail_tabs/StockLogTab'
import { CostVersionTab } from './detail_tabs/CostVersionTab'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" borderBottomWidth={1} borderColor="gray.100" pb={2}>
      <Text fontSize="sm" color="gray.500">{label}</Text>
      <Text fontSize="sm" fontWeight="medium">{value}</Text>
    </Flex>
  )
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

  if (isLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (!sku) return <Text p={6} color="gray.400">SKU not found.</Text>

  const warehouseName = warehouseData?.warehouses[sku.warehouseId]?.name

  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack mb={4} gap={3}>
        <Link to="/stock/skus">
          <ArrowLeft size={18} />
        </Link>
        <Heading size="md" fontFamily="mono">{sku.code}</Heading>
      </HStack>

      {/* Info card */}
      <Box bg="white" borderRadius="lg" p={4} boxShadow="sm" mb={6} maxW="480px">
        <VStack gap={2} align="stretch">
          <DetailRow label="Warehouse" value={warehouseName ?? `#${sku.warehouseId}`} />
          <DetailRow label="Left Stock" value={String(sku.leftStock)} />
          <DetailRow label="Branch" value={`#${sku.branchId}`} />
          <DetailRow label="Created" value={formatDateTime(sku.createdAt as Timestamp | undefined)} />
          <DetailRow label="Last Stock In" value={formatDateTime(sku.lastStockIn as Timestamp | undefined)} />
          <DetailRow label="Last Adjustment" value={formatDateTime(sku.lastAdjustment as Timestamp | undefined)} />
          <DetailRow label="Last Stock Out" value={formatDateTime(sku.lastStockOut as Timestamp | undefined)} />
        </VStack>
      </Box>

      {/* Tabs */}
      <Tabs.Root defaultValue="stocklog" variant="line">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="stocklog">Stock Log</Tabs.Trigger>
          <Tabs.Trigger value="priceversion">Price Version</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="stocklog"><StockLogTab id={id} skuId={skuId} /></Tabs.Content>
        <Tabs.Content value="priceversion"><CostVersionTab id={id} skuId={skuId} /></Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
