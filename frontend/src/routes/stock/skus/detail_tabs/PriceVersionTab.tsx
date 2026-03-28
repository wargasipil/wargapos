import { useQuery } from '@tanstack/react-query'
import { Box } from '@chakra-ui/react'
import { stockClient } from '../../../../client'
import { formatDateTime, formatPrice } from '../../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { EmptyRow, thStyle, tdStyle, tdRight } from './common'

export function PriceVersionTab({ id, skuId }: { id: string; skuId: number }) {
  const { data: pricesData } = useQuery({
    queryKey: ['sku-prices', id],
    queryFn: () => stockClient.listPriceSku({ skuId }),
  })

  const prices = pricesData?.prices ?? []

  return (
    <Box borderWidth={1} borderColor="gray.100" borderRadius="md" overflow="hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f7fafc' }}>
          <tr>
            <th style={thStyle}>Price</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Initiate</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Left</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Tx ID</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p) => (
            <tr key={String(p.id)}>
              <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{formatPrice(BigInt(Math.round(p.price)))}</td>
              <td style={tdRight}>{p.stockInitiate}</td>
              <td style={tdRight}>{p.leftStock}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{String(p.transactionId)}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{formatDateTime(p.createdAt as Timestamp | undefined)}</td>
            </tr>
          ))}
          {prices.length === 0 && <EmptyRow cols={5} />}
        </tbody>
      </table>
    </Box>
  )
}
