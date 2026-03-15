import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Flex, Heading, HStack, Input, Spinner, Table, Text,
  Dialog, Field, VStack,
} from '@chakra-ui/react'
import { Tag, Plus } from 'lucide-react'
import { CategoryCard } from '../../components/shared/CategoryCard'
import { CategoryTableRow } from '../../components/shared/CategoryTableRow'
import { productClient } from '../../client'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'

export function CategoriesPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })

  const createMutation = useMutation({
    mutationFn: () => productClient.createCategory({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setDialogOpen(false)
      setName('')
      toaster.create({ title: 'Category created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  const categories = data?.categories ?? []

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><Tag size={22} /><Heading size="md">Categories</Heading></HStack>
        <Button colorPalette="blue" size="sm" width={{ base: 'full', md: 'auto' }} onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> Add Category
        </Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <>
          {/* Mobile card list */}
          <VStack display={{ base: 'flex', md: 'none' }} gap={3} align="stretch">
            {categories.map((c) => <CategoryCard key={String(c.id)} c={c} />)}
            {categories.length === 0 && (
              <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>No categories yet.</Text>
            )}
          </VStack>

          {/* Desktop table */}
          <Box display={{ base: 'none', md: 'block' }}>
            <Table.Root variant="outline" maxW="480px">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>ID</Table.ColumnHeader>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {categories.map((c) => <CategoryTableRow key={String(c.id)} c={c} />)}
                {categories.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={2} textAlign="center" color="gray.400" py={8}>No categories yet.</Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={(d) => { if (!d.open) { setDialogOpen(false); setName('') } }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="360px">
            <Dialog.Header>
              <Dialog.Title>Add Category</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} as="form" id="category-form" onSubmit={handleSubmit}>
                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </Field.Root>
              </VStack>
              {createMutation.error && (
                <Text color="red.500" fontSize="sm" mt={2}>{String(createMutation.error)}</Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => { setDialogOpen(false); setName('') }}>Cancel</Button>
              <Button form="category-form" type="submit" colorPalette="blue" loading={createMutation.isPending}>
                Create
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
