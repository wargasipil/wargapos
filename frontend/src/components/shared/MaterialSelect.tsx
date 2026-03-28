import { useQuery } from '@tanstack/react-query'
import { Select, createListCollection } from '@chakra-ui/react'
import { ingredientClient } from '../../client'

interface Props {
  value: number
  onChange: (id: number) => void
  placeholder?: string
  size?: 'sm' | 'md'
  minW?: string
}

export function MaterialSelect({
  value,
  onChange,
  placeholder = 'Select material…',
  size = 'sm',
  minW = '160px',
}: Props) {
  const { data } = useQuery({
    queryKey: ['materials-select'],
    queryFn: () => ingredientClient.listMaterial({ page: 1, pageSize: 200, search: '' }),
  })

  const materials = data?.materials ?? []

  const collection = createListCollection({
    items: [
      { label: placeholder, value: '0' },
      ...materials.map((m) => ({ label: m.name, value: String(m.id) })),
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
