import { useState } from 'react'
import { Box, Button, Drawer, Flex, Text } from '@chakra-ui/react'
import { SlidersHorizontal } from 'lucide-react'

interface Category {
  id: bigint
  name: string
}

interface Props {
  categories: Category[]
  categoryId: bigint
  onCategoryChange: (id: bigint) => void
  onReset: () => void
}

export function ProductFilter({ categories, categoryId, onCategoryChange, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = categoryId !== 0n ? 1 : 0

  return (
    <>
      <Button
        size="sm"
        variant={activeCount > 0 ? 'solid' : 'outline'}
        colorPalette={activeCount > 0 ? 'blue' : 'gray'}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={14} />
        Filter
        {activeCount > 0 && (
          <Box
            as="span"
            bg="white"
            color="blue.600"
            borderRadius="full"
            px={1.5}
            fontSize="10px"
            fontWeight="bold"
            ml={1}
          >
            {activeCount}
          </Box>
        )}
      </Button>

      <Drawer.Root placement="bottom" open={open} onOpenChange={(d) => setOpen(d.open)}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content borderTopRadius="xl" maxH="70vh">
            <Drawer.Header borderBottomWidth="1px">
              <Drawer.Title>Filter Products</Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Category</Text>
                <Flex gap={2} wrap="wrap">
                  <Button
                    size="sm"
                    variant={categoryId === 0n ? 'solid' : 'outline'}
                    colorPalette={categoryId === 0n ? 'blue' : 'gray'}
                    onClick={() => onCategoryChange(0n)}
                  >
                    All
                  </Button>
                  {categories.map((c) => (
                    <Button
                      key={String(c.id)}
                      size="sm"
                      variant={categoryId === c.id ? 'solid' : 'outline'}
                      colorPalette={categoryId === c.id ? 'blue' : 'gray'}
                      onClick={() => onCategoryChange(c.id)}
                    >
                      {c.name}
                    </Button>
                  ))}
                </Flex>
              </Box>
            </Drawer.Body>
            <Drawer.Footer borderTopWidth="1px" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => { onReset(); setOpen(false) }}>
                Reset
              </Button>
              <Button size="sm" colorPalette="blue" onClick={() => setOpen(false)}>
                Done
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  )
}
