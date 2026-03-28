import { useQuery } from '@tanstack/react-query'
import { Select, createListCollection } from '@chakra-ui/react'
import { productClient } from '../../client'

interface Props {
  value: bigint
  onChange: (id: bigint) => void
  placeholder?: string
  size?: 'sm' | 'md'
  minW?: string
}

export function ProductSelect({
  value,
  onChange,
  placeholder = 'Select product…',
  size = 'sm',
  minW = '160px',
}: Props) {
  const { data } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productClient.listProducts({ pageSize: 1000 }),
  })

  const products = data?.products ?? []

  const collection = createListCollection({
    items: [
      { label: placeholder, value: '0' },
      ...products.map((p) => ({ label: p.name, value: String(p.id) })),
    ],
  })

  return (
    <Select.Root
      collection={collection}
      value={[String(value)]}
      onValueChange={(e) => onChange(BigInt(e.value[0] ?? '0'))}
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
