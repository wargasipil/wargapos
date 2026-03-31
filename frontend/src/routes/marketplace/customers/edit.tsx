import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Box, Button, Field, Heading, HStack, Input, Spinner, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'

export function MarketplaceCustomerEditPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-customer', id],
    queryFn: () => marketplaceClient.getCustomer({ id: BigInt(id) }),
    enabled: !!id,
  })

  useEffect(() => {
    if (data?.customer) {
      setName(data.customer.name)
      setPhone(data.customer.phoneNumber)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () => marketplaceClient.updateCustomer({ id: BigInt(id), name, phoneNumber: phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-customers'] })
      qc.invalidateQueries({ queryKey: ['marketplace-customer', id] })
      toaster.create({ title: 'Customer updated', type: 'success', duration: 2000 })
      navigate({ to: '/marketplace/customers/$id', params: { id } })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    updateMutation.mutate()
  }

  if (isLoading) return <Box p={6}><Spinner /></Box>

  return (
    <Box p={{ base: 3, md: 6 }} maxW="480px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/customers/$id" params={{ id }}><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Edit Customer</Heading>
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
            <Link to="/marketplace/customers/$id" params={{ id }}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            loading={updateMutation.isPending}
            disabled={!name.trim()}
          >
            Save Changes
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
