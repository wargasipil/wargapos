import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { createListCollection, Select } from '@chakra-ui/react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { stockClient } from '../../../client'
import { toaster } from '../../../components/ui/toaster'
import { stripError } from '../../../lib/errors'
import { SkuSelect } from '../../../components/shared/SkuSelect'
import { PlacementType } from '../../../gen/wargapos/stock/v1/placement_pb'

const typeOptions = createListCollection({
  items: [
    { label: 'Select type…', value: '0' },
    { label: 'Broken', value: String(PlacementType.BROKEN) },
    { label: 'Lost',   value: String(PlacementType.LOST) },
  ],
})

export function RackAdjustPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const rackId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [skuId, setSkuId] = useState(0)
  const [placementType, setPlacementType] = useState('0')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')

  const { data: rackData, isLoading: rackLoading } = useQuery({
    queryKey: ['rack', rackId],
    queryFn: () => stockClient.getRack({ by: { case: 'id', value: rackId } }),
    enabled: !!rackId,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const typeNum = Number(placementType) as PlacementType
      if (!skuId) throw new Error('SKU is required')
      if (!typeNum) throw new Error('Type is required')
      if (!qty || Number(qty) <= 0) throw new Error('Quantity must be greater than zero')
      if (!reason || reason.trim().length < 3) throw new Error('Reason must be at least 3 characters')

      const count = Math.abs(Number(qty))

      return stockClient.createTransaction({
        kind: {
          case: 'problem',
          value: {
            problem: [{ skuId, rackId, count, type: typeNum, reason: reason.trim() }],
          },
        },
        note: reason.trim(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack', rackId] })
      qc.invalidateQueries({ queryKey: ['rack-placement', rackId] })
      qc.invalidateQueries({ queryKey: ['placement-log', rackId] })
      toaster.create({ title: 'Adjustment saved', type: 'success', duration: 2000 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: '/stock/placement/$id', params: { id } } as any)
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const rack = rackData?.rack

  if (rackLoading) return <Flex justify="center" mt={16}><Spinner /></Flex>
  if (!rack) return <Text p={6} color="gray.400">Rack not found.</Text>

  return (
    <Box p={{ base: 3, md: 6 }} maxW="480px">
      <HStack mb={5} gap={3}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/stock/placement/$id" params={{ id }}>
            <ArrowLeft size={16} />
          </Link>
        </Button>
        <Heading size="md">Report Problem</Heading>
      </HStack>

      <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
        <Text fontSize="sm" color="gray.500" mb={4}>
          Rack: <Text as="span" fontWeight="semibold" color="gray.800">{rack.name}</Text>
        </Text>

        <VStack gap={4} align="stretch">
          <Field.Root required>
            <Field.Label fontSize="sm">SKU</Field.Label>
            <SkuSelect value={skuId} onChange={setSkuId} w="100%" />
          </Field.Root>

          <Field.Root required>
            <Field.Label fontSize="sm">Problem Type</Field.Label>
            <Select.Root
              collection={typeOptions}
              value={[placementType]}
              onValueChange={({ value }) => setPlacementType(value[0] ?? '0')}
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger><Select.ValueText /></Select.Trigger>
                <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {typeOptions.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      <Select.ItemText>{item.label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Field.Root>

          <Field.Root required>
            <Field.Label fontSize="sm">
              Quantity
              <Text as="span" fontSize="xs" color="orange.500" ml={2}>(will be deducted)</Text>
            </Field.Label>
            <Input
              size="sm"
              type="number"
              min={1}
              placeholder="e.g. 10"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label fontSize="sm">Reason <Text as="span" fontSize="xs" color="gray.400">(min 3 chars)</Text></Field.Label>
            <Input
              size="sm"
              placeholder="e.g. damaged in transit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field.Root>
        </VStack>
      </Box>

      <HStack mt={4} justify="flex-end" gap={2}>
        <Button variant="outline" size="sm" asChild>
          <Link to="/stock/placement/$id" params={{ id }}>Cancel</Link>
        </Button>
        <Button
          colorPalette="orange"
          size="sm"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Report Problem
        </Button>
      </HStack>
    </Box>
  )
}
