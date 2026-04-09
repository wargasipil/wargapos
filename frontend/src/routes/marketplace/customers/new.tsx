import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Box, Button, Field, Heading, HStack, Input, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import { marketplaceOrderClient } from '../../../client'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'

export function MarketplaceCustomerNewPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const createMutation = useMutation({
    mutationFn: () => marketplaceOrderClient.createCustomer({ name, phoneNumber: phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-customers'] })
      toaster.create({ title: 'Customer created', type: 'success', duration: 2000 })
      navigate({ to: '/marketplace/customers' })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate()
  }

  return (
    <Box p={{ base: 3, md: 6 }} maxW="480px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/customers"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">New Customer</Heading>
      </HStack>

      <VStack gap={4} as="form" onSubmit={handleSubmit} align="stretch">
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer name"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Phone Number</Field.Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 08123456789"
          />
        </Field.Root>

        <HStack justify="flex-end" mt={2}>
          <Button asChild variant="ghost">
            <Link to="/marketplace/customers">Cancel</Link>
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            loading={createMutation.isPending}
            disabled={!name.trim()}
          >
            Create Customer
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
