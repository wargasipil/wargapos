import { useQuery } from '@tanstack/react-query'
import { Select, createListCollection } from '@chakra-ui/react'
import { stockClient } from '../../client'

interface Props {
  value: number
  onChange: (id: number) => void
  withAll?: boolean
  placeholder?: string
  size?: 'sm' | 'md'
  w?: string
}

export function WarehouseSelect({
  value,
  onChange,
  withAll = false,
  placeholder = 'Select warehouse…',
  size = 'sm',
  w = '180px',
}: Props) {
  const { data } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => stockClient.listWarehouse({ page: 1, pageSize: 100, search: '' }),
  })

  const warehouses = data?.warehouses ?? []

  const collection = createListCollection({
    items: [
      ...(withAll
        ? [{ label: 'All warehouses', value: '0' }]
        : [{ label: placeholder, value: '0' }]
      ),
      ...warehouses.map((w) => ({ label: w.name, value: String(w.id) })),
    ],
  })

  return (
    <Select.Root
      collection={collection}
      value={[String(value)]}
      onValueChange={(e) => onChange(Number(e.value[0] ?? '0'))}
      size={size}
      w={w}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText>{item.label}</Select.ItemText>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
