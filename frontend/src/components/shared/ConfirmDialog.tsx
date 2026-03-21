import { Button, Dialog } from '@chakra-ui/react'

interface Props {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  loading?: boolean
  onConfirm(): void
  onCancel(): void
}

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Delete', loading, onConfirm, onCancel,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(d) => { if (!d.open) onCancel() }}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="360px">
          <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
          <Dialog.Body>{description}</Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button colorPalette="red" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
