import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Flex, Heading, Input, Spinner, Table, Text,
  Dialog, Field, VStack,
} from '@chakra-ui/react'
import { productClient } from '../../client'

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
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  const categories = data?.categories ?? []

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">Categories</Heading>
        <Button colorPalette="blue" size="sm" onClick={() => setDialogOpen(true)}>+ Add Category</Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <Table.Root variant="outline" maxW="480px">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ID</Table.ColumnHeader>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {categories.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell color="gray.400" fontSize="xs">{c.id.slice(0, 8)}…</Table.Cell>
                <Table.Cell fontWeight="medium">{c.name}</Table.Cell>
              </Table.Row>
            ))}
            {categories.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={2} textAlign="center" color="gray.400" py={8}>No categories yet.</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
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
