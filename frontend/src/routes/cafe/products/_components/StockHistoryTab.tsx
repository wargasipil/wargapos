import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Badge, Button, Flex, HStack, Input, Table, Text,
} from '@chakra-ui/react'
import { stockClient } from '../../../../client'
import type { StockMovement } from '../../../../gen/wargapos/stock/v1/service_pb'

function fmtDate(raw: string): string {
  const d = new Date(raw.replace(' ', 'T') + 'Z')
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const reasonColor: Record<string, string> = {
  restock: 'green',
  sale: 'blue',
  adjustment: 'orange',
}

interface Props {
  productId: string
}

export function StockHistoryTab({ productId }: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [allMovements, setAllMovements] = useState<StockMovement[]>([])

  const { data: movData, isFetching } = useQuery({
    queryKey: ['stock-movements', productId, page, dateFrom, dateTo],
    queryFn: () => stockClient.listStockMovements({
      productId: BigInt(productId),
      page,
      pageSize: 20,
      dateFrom,
      dateTo,
    }),
    enabled: !!productId,
  })

  useEffect(() => {
    if (!movData) return
    if (page === 1) {
      setAllMovements(movData.movements)
    } else {
      setAllMovements((prev) => [...prev, ...movData.movements])
    }
  }, [movData])

  function applyDateFilter(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    setPage(1)
    setAllMovements([])
  }

  const total = movData?.total ?? 0

  return (
    <>
      <HStack mb={4} gap={2} flexWrap="wrap">
        <Input
          type="date"
          size="sm"
          maxW="140px"
          value={dateFrom}
          onChange={(e) => applyDateFilter(e.target.value, dateTo)}
        />
        <Text fontSize="xs" color="gray.400">–</Text>
        <Input
          type="date"
          size="sm"
          maxW="140px"
          value={dateTo}
          onChange={(e) => applyDateFilter(dateFrom, e.target.value)}
        />
        {(dateFrom || dateTo) && (
          <Button size="xs" variant="ghost" onClick={() => applyDateFilter('', '')}>
            Clear
          </Button>
        )}
      </HStack>

      {allMovements.length === 0 && !isFetching ? (
        <Text color="gray.500" fontSize="sm">No movements yet.</Text>
      ) : (
        <>
          <Table.Root variant="outline" size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Date</Table.ColumnHeader>
                <Table.ColumnHeader>Delta</Table.ColumnHeader>
                <Table.ColumnHeader>Reason</Table.ColumnHeader>
                <Table.ColumnHeader>Note</Table.ColumnHeader>
                <Table.ColumnHeader>By</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {allMovements.map((m) => (
                <Table.Row key={String(m.id)}>
                  <Table.Cell fontSize="xs" color="gray.500">{fmtDate(m.createdAt)}</Table.Cell>
                  <Table.Cell fontWeight="medium" color={m.delta > 0 ? 'green.600' : 'red.500'}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={reasonColor[m.reason] ?? 'gray'} size="sm">{m.reason}</Badge>
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.500">{m.note}</Table.Cell>
                  <Table.Cell fontSize="xs">{m.createdByName || '—'}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          <Flex justify="space-between" align="center" mt={3}>
            <Text fontSize="xs" color="gray.400">{allMovements.length} of {total}</Text>
            {allMovements.length < total && (
              <Button
                size="sm"
                variant="outline"
                loading={isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Load more
              </Button>
            )}
          </Flex>
        </>
      )}
    </>
  )
}
