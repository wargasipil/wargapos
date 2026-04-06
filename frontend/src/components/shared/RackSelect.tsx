import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Button, Flex, Input, Popover, Portal, Spinner, Text } from '@chakra-ui/react'
import { ChevronDown, X } from 'lucide-react'
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
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['racks-select', warehouseId],
    queryFn: () => stockClient.listRack({ filter: { warehouseId: warehouseId ?? 0 } }),
  })

  const racks = (data?.racks ?? []).filter((r) => r.id !== excludeRackId)
  const filtered = search.trim()
    ? racks.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : racks

  const selectedLabel = value
    ? (racks.find((r) => r.id === value)?.name ?? `#${value}`)
    : placeholder

  function select(id: number) {
    onChange(id)
    setSearch('')
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={({ open: o }) => {
        setOpen(o)
        if (o) setTimeout(() => inputRef.current?.focus(), 50)
        else setSearch('')
      }}
      positioning={{ placement: 'bottom-start', sameWidth: true }}
    >
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          size={size}
          w={w}
          justifyContent="space-between"
          fontWeight="normal"
          color={value ? 'inherit' : 'gray.400'}
        >
          <Text fontSize="inherit" truncate flex={1} textAlign="left">
            {selectedLabel}
          </Text>
          <Flex gap={1} align="center" flexShrink={0}>
            {value > 0 && (
              <Box
                as="span"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); select(0) }}
                cursor="pointer"
                color="gray.400"
                _hover={{ color: 'gray.700' }}
                display="flex"
                alignItems="center"
              >
                <X size={12} />
              </Box>
            )}
            <ChevronDown size={14} />
          </Flex>
        </Button>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content p={0} maxH="300px" overflow="hidden" display="flex" flexDir="column">
            <Box p={2} borderBottom="1px solid" borderColor="gray.100">
              <Input
                ref={inputRef}
                size="sm"
                placeholder="Search rack…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </Box>
            <Box overflowY="auto" flex={1}>
              {isLoading ? (
                <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
              ) : filtered.length === 0 ? (
                <Text fontSize="sm" color="gray.400" textAlign="center" py={3}>No racks found</Text>
              ) : (
                <>
                  {value > 0 && (
                    <Box
                      px={3} py={1.5} fontSize="sm" color="gray.400"
                      cursor="pointer" _hover={{ bg: 'gray.50' }}
                      onClick={() => select(0)}
                    >
                      {placeholder}
                    </Box>
                  )}
                  {filtered.map((r) => (
                    <Box
                      key={r.id}
                      px={3} py={1.5}
                      fontSize="sm"
                      cursor="pointer"
                      bg={r.id === value ? 'blue.50' : undefined}
                      color={r.id === value ? 'blue.700' : undefined}
                      _hover={{ bg: r.id === value ? 'blue.50' : 'gray.50' }}
                      onClick={() => select(r.id)}
                    >
                      {r.name}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
