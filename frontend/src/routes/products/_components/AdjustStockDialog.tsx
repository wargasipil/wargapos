import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Alert, Button, Dialog, Field, HStack, Input, NativeSelect,
} from '@chakra-ui/react'
import { stockClient } from '../../../client'
import { stripError } from '../../../lib/errors'

interface Props {
  productId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdjustStockDialog({ productId, open, onClose, onSuccess }: Props) {
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('restock')
  const [note, setNote] = useState('')

  function reset() {
    setDelta('')
    setReason('restock')
    setNote('')
  }

  const adjustMutation = useMutation({
    mutationFn: () =>
      stockClient.adjustStock({
        productId: BigInt(productId),
        delta: parseInt(delta, 10),
        reason,
        note,
      }),
    onSuccess: () => {
      onSuccess()
      onClose()
      reset()
    },
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d) => { if (!d.open) { onClose(); reset() } }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="380px">
          <Dialog.Header>
            <Dialog.Title>Adjust Stock</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <HStack gap={3} mb={3}>
              <Field.Root flex={1}>
                <Field.Label fontSize="xs">Delta (+ add / − deduct)</Field.Label>
                <Input
                  type="number"
                  size="sm"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. 10 or -5"
                  autoFocus
                />
              </Field.Root>
              <Field.Root flex={1}>
                <Field.Label fontSize="xs">Reason</Field.Label>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="restock">Restock</option>
                    <option value="adjustment">Adjustment</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </HStack>
            <Field.Root>
              <Field.Label fontSize="xs">Note (optional)</Field.Label>
              <Input
                size="sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Received from supplier"
              />
            </Field.Root>
            {adjustMutation.isError && (
              <Alert.Root status="error" borderRadius="md" mt={3}>
                <Alert.Indicator />
                <Alert.Description fontSize="sm">{stripError(adjustMutation.error)}</Alert.Description>
              </Alert.Root>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" onClick={() => { onClose(); reset() }}>Cancel</Button>
            <Button
              colorPalette="blue"
              loading={adjustMutation.isPending}
              disabled={!delta || delta === '0'}
              onClick={() => adjustMutation.mutate()}
            >
              Apply
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
