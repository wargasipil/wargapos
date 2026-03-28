import { useQuery } from '@tanstack/react-query'
import { Select, createListCollection } from '@chakra-ui/react'
import { stockClient } from '../../client'

interface Props {
  value: number
  onChange: (id: number) => void
  placeholder?: string
  size?: 'sm' | 'md'
  minW?: string
}

export function SkuSelect({
  value,
  onChange,
  placeholder = 'Select SKU…',
  size = 'sm',
  minW = '160px',
}: Props) {
  const { data } = useQuery({
    queryKey: ['skus-select'],
    queryFn: () => stockClient.listSku({ page: 1, pageSize: 200, productId: 0, search: '' }),
  })

  const skus = data?.skus ?? []

  const collection = createListCollection({
    items: [
      { label: placeholder, value: '0' },
      ...skus.map((s) => ({ label: s.code, value: String(s.id) })),
    ],
  })

  return (
    <Select.Root
      collection={collection}
      value={[String(value)]}
      onValueChange={(e) => onChange(Number(e.value[0] ?? '0'))}
      size={size}
      minW={minW}
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
