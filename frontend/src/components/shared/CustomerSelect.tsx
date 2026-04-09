import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Button, Flex, Input, Popover, Portal, Spinner, Text } from '@chakra-ui/react'
import { ChevronDown, X } from 'lucide-react'
import { useDebounce } from '../../lib/useDebounce'
import { marketplaceOrderClient } from '../../client'

interface Props {
  value: bigint
  onChange: (id: bigint, name: string, phone: string) => void
  placeholder?: string
  w?: string
}

export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Select customer…',
  w,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: listData, isLoading } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: () => marketplaceOrderClient.listCustomers({ page: 1, pageSize: 10, search: debouncedSearch }),
    enabled: open,
  })

  const { data: selectedData } = useQuery({
    queryKey: ['customer-by-id', String(value)],
    queryFn: () => marketplaceOrderClient.listCustomers({ page: 1, pageSize: 1, search: String(value) }),
    enabled: value > 0n,
    staleTime: Infinity,
  })

  const customers = listData?.customers ?? []
  const selectedLabel = value > 0n
    ? (selectedData?.customers[0]?.name ?? customers.find((c) => c.id === value)?.name ?? `#${value}`)
    : placeholder

  function select(id: bigint, name: string, phone: string) {
    onChange(id, name, phone)
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
          size="sm"
          w={w}
          minW="180px"
          justifyContent="space-between"
          fontWeight="normal"
          color={value > 0n ? 'inherit' : 'gray.400'}
        >
          <Text fontSize="inherit" truncate flex={1} textAlign="left">{selectedLabel}</Text>
          <Flex gap={1} align="center" flexShrink={0}>
            {value > 0n && (
              <Box
                as="span"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); select(0n, '', '') }}
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
          <Popover.Content p={0} maxH="320px" overflow="hidden" display="flex" flexDir="column">
            <Box p={2} borderBottom="1px solid" borderColor="gray.100">
              <Input
                ref={inputRef}
                size="sm"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </Box>
            <Box overflowY="auto" flex={1}>
              {isLoading ? (
                <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
              ) : customers.length === 0 ? (
                <Text fontSize="sm" color="gray.400" textAlign="center" py={3}>No customers found</Text>
              ) : (
                <>
                  {value > 0n && (
                    <Box
                      px={3} py={1.5} fontSize="sm" color="gray.400"
                      cursor="pointer" _hover={{ bg: 'gray.50' }}
                      onClick={() => select(0n, '', '')}
                    >
                      {placeholder}
                    </Box>
                  )}
                  {customers.map((c) => (
                    <Box
                      key={String(c.id)}
                      px={3} py={1.5}
                      fontSize="sm"
                      cursor="pointer"
                      bg={c.id === value ? 'blue.50' : undefined}
                      color={c.id === value ? 'blue.700' : undefined}
                      _hover={{ bg: c.id === value ? 'blue.50' : 'gray.50' }}
                      onClick={() => select(c.id, c.name, c.phoneNumber)}
                    >
                      <Text fontWeight="medium">{c.name}</Text>
                      {c.phoneNumber && (
                        <Text fontSize="xs" color="gray.500">{c.phoneNumber}</Text>
                      )}
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
