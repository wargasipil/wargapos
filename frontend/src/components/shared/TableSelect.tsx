import { Select, createListCollection } from '@chakra-ui/react'

interface Table {
  id: bigint
  name: string
}

interface Props {
  tables: Table[]
  value: bigint
  onChange: (id: bigint) => void
  placeholder?: string
  size?: 'sm' | 'md'
}

export function TableSelect({ tables, value, onChange, placeholder = 'All tables', size = 'sm' }: Props) {
  const collection = createListCollection({
    items: [
      { label: placeholder, value: '0' },
      ...tables.map((t) => ({ label: t.name, value: String(t.id) })),
    ],
  })

  return (
    <Select.Root
      collection={collection}
      value={[String(value)]}
      onValueChange={(e) => onChange(BigInt(e.value[0] ?? '0'))}
      size={size}
      minW="130px"
      maxW="180px"
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
