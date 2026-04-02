import { useQuery } from '@tanstack/react-query'
import { Box } from '@chakra-ui/react'
import { stockClient } from '../../../../client'
import { EmptyRow, thStyle, tdStyle, tdRight } from './common'

export function PlacementTab({ skuId }: { skuId: number }) {
  const { data } = useQuery({
    queryKey: ['sku-placement', skuId],
    queryFn: () => stockClient.listSkuPlacement({ skuId }),
  })

  const placements = data?.placements ?? []

  return (
    <Box borderWidth={1} borderColor="gray.100" borderRadius="md" overflow="hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f7fafc' }}>
          <tr>
            <th style={thStyle}>Rack</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Left Stock</th>
          </tr>
        </thead>
        <tbody>
          {placements.map((p) => (
            <tr key={String(p.id)}>
              <td style={tdStyle}>{p.rack?.name ?? '—'}</td>
              <td style={tdRight}>{p.leftStock.toLocaleString('id-ID')}</td>
            </tr>
          ))}
          {placements.length === 0 && <EmptyRow cols={2} />}
        </tbody>
      </table>
    </Box>
  )
}
