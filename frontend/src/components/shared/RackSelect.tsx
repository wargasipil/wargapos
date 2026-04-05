import { useQuery } from '@tanstack/react-query'
import { Select, createListCollection } from '@chakra-ui/react'
import { stockClient } from '../../client'

interface Props {
  value: number
  onChange: (id: number) => void
  warehouseId?: number
  excludeRackId?: number
  placeholder?: string
  size?: 'sm' | 'md'
  w?: string
}

export function RackSelect({
  value,
  onChange,
  warehouseId,
  excludeRackId,
  placeholder = 'Select rack…',
  size = 'sm',
  w = '180px',
}: Props) {
  const { data } = useQuery({
    queryKey: ['racks-select', warehouseId],
    queryFn: () => stockClient.listRack({ filter: { warehouseId: warehouseId ?? 0 } }),
  })

  const racks = (data?.racks ?? []).filter((r) => r.id !== excludeRackId)

  const collection = createListCollection({
    items: [
      { label: placeholder, value: '0' },
      ...racks.map((r) => ({ label: r.name, value: String(r.id) })),
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
