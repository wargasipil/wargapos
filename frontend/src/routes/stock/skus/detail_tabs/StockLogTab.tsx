import { useQuery } from '@tanstack/react-query'
import { Box } from '@chakra-ui/react'
import { stockClient, userClient } from '../../../../client'
import { LogType } from '../../../../gen/wargapos/stock/v1/stock_pb'
import { formatDateTime } from '../../../../lib/format'
import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { EmptyRow, thStyle, tdStyle, tdRight } from './common'

function logTypeLabel(t: LogType): string {
  switch (t) {
    case LogType.STOCK_IN: return 'Stock In'
    case LogType.STOCK_OUT: return 'Stock Out'
    case LogType.STOCK_CANCEL: return 'Cancel'
    case LogType.ADJUSTMENT: return 'Adjustment'
    case LogType.ORDER: return 'Order'
    default: return 'Unknown'
  }
}

export function StockLogTab({ id, skuId }: { id: string; skuId: number }) {
  const { data: logsData } = useQuery({
    queryKey: ['sku-stocklog', id],
    queryFn: () => stockClient.listStockLogSku({ skuId, page: 1, pageSize: 100 }),
  })

  const logs = logsData?.logs ?? []
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id) => id > 0))]
  const { data: actorsData } = useQuery({
    queryKey: ['users-actors', actorIds.join(',')],
    queryFn: () => userClient.getUser({ ids: actorIds }),
    enabled: actorIds.length > 0,
  })

  return (
    <Box borderWidth={1} borderColor="gray.100" borderRadius="md" overflow="hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f7fafc' }}>
          <tr>
            <th style={thStyle}>Type</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Change</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Tx ID</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Cost Ver.</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Date</th>
            <th style={thStyle}>Actor</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={String(l.id)}>
              <td style={tdStyle}>{logTypeLabel(l.logType)}</td>
              <td style={{ ...tdRight, color: l.change >= 0 ? '#276749' : '#c53030', fontFamily: 'monospace' }}>
                {l.change >= 0 ? '+' : ''}{l.change}
              </td>
              <td style={{ ...tdRight, color: '#718096' }}>{String(l.transactionId)}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{l.costVersionId > 0n ? String(l.costVersionId) : '—'}</td>
              <td style={{ ...tdRight, color: '#718096' }}>{formatDateTime(l.createdAt as Timestamp | undefined)}</td>
              <td style={tdStyle}>{actorsData?.users[l.actorId]?.fullName ?? (l.actorId > 0 ? `#${l.actorId}` : '—')}</td>
            </tr>
          ))}
          {logs.length === 0 && <EmptyRow cols={6} />}
        </tbody>
      </table>
    </Box>
  )
}
