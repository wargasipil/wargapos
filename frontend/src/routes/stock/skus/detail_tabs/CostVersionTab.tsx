import { useQuery } from '@tanstack/react-query'
import { Box } from '@chakra-ui/react'
import { stockClient } from '../../../../client'
import { formatDateTime, formatPrice } from '../../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { EmptyRow, thStyle, tdStyle, tdRight } from './common'

export function CostVersionTab({ id, skuId }: { id: string; skuId: number }) {
  const { data: costsData } = useQuery({
    queryKey: ['sku-costs', id],
    queryFn: () => stockClient.listCostSku({ skuId }),
  })

  const costs = costsData?.costs ?? []

  return (
    <Box borderWidth={1} borderColor="gray.100" borderRadius="md" overflow="hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f7fafc' }}>
          <tr>
            <th style={thStyle}>Unit Cost</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Initiate</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Left</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Tx ID</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {costs.map((c) => (
            <tr key={String(c.id)}>
              <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{formatPrice(BigInt(Math.round(c.unitCost)))}</td>
              <td style={tdRight}>{c.stockInitiate}</td>
              <td style={tdRight}>{c.leftStock}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{String(c.transactionId)}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{formatDateTime(c.createdAt as Timestamp | undefined)}</td>
            </tr>
          ))}
          {costs.length === 0 && <EmptyRow cols={5} />}
        </tbody>
      </table>
    </Box>
  )
}
