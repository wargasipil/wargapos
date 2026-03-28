import { useQuery } from '@tanstack/react-query'
import { Box } from '@chakra-ui/react'
import { stockClient } from '../../../../client'
import { formatDateTime } from '../../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { EmptyRow, thStyle, tdStyle, tdRight } from './common'

export function StockTab({ id, skuId }: { id: string; skuId: number }) {
  const { data: stocksData } = useQuery({
    queryKey: ['sku-stocks', id],
    queryFn: () => stockClient.listStockSku({ skuId }),
  })

  const stocks = stocksData?.stocks ?? []

  return (
    <Box borderWidth={1} borderColor="gray.100" borderRadius="md" overflow="hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f7fafc' }}>
          <tr>
            <th style={thStyle}>Initiate</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Left</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Tx ID</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr key={String(s.id)}>
              <td style={tdStyle}>{s.stockInitiate}</td>
              <td style={tdRight}>{s.leftStock}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{String(s.transactionId)}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{formatDateTime(s.createdAt as Timestamp | undefined)}</td>
            </tr>
          ))}
          {stocks.length === 0 && <EmptyRow cols={4} />}
        </tbody>
      </table>
    </Box>
  )
}
