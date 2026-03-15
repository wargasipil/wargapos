import { HStack, NativeSelect } from '@chakra-ui/react'
import { Tag } from 'lucide-react'

interface Category {
  id: bigint
  name: string
}

interface Props {
  categories: Category[]
  value: bigint
  onChange: (id: bigint) => void
  placeholder?: string
  size?: 'sm' | 'md'
}

export function CategorySelect({ categories, value, onChange, placeholder = 'All categories', size = 'sm' }: Props) {
  return (
    <HStack gap={1.5} align="center">
      <Tag size={14} color="gray" />
      <NativeSelect.Root size={size} minW="160px">
        <NativeSelect.Field
          value={String(value)}
          onChange={(e) => onChange(BigInt(e.target.value))}
        >
          <option value="0">{placeholder}</option>
          {categories.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </HStack>
  )
}
