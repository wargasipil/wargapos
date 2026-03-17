import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Dialog, RadioGroup, Spinner, Text, VStack } from '@chakra-ui/react'
import { deviceClient } from '../../client'
import { usePrinterStore } from '../../store/printer'

interface Props {
  open: boolean
  onClose: () => void
}

function printerKey(deviceId: string, name: string) {
  return `${deviceId}:${name}`
}

export function PrinterSettingsDialog({ open, onClose }: Props) {
  const { selectedPrinter, setSelectedPrinter } = usePrinterStore()
  const [value, setValue] = useState<string>(
    selectedPrinter ? printerKey(selectedPrinter.deviceId, selectedPrinter.name) : ''
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['device-printers'],
    queryFn: () => deviceClient.listPrinters({}),
    enabled: open,
    retry: false,
  })

  const printers = data?.printers ?? []

  function handleSave() {
    if (!value) {
      setSelectedPrinter(null)
    } else {
      const found = printers.find((p) => printerKey(p.deviceId, p.name) === value)
      setSelectedPrinter(found ? { deviceId: found.deviceId, name: found.name } : null)
    }
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(d) => { if (!d.open) onClose() }}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="360px">
          <Dialog.Header>
            <Dialog.Title>Printer Settings</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {isLoading && <Spinner />}
            {isError && (
              <Alert.Root status="error">
                <Alert.Description>
                  Could not load printers. Make sure the connector is connected to the server.
                </Alert.Description>
              </Alert.Root>
            )}
            {!isLoading && !isError && printers.length === 0 && (
              <Text color="gray.500" fontSize="sm">No printers found. Connect a device first.</Text>
            )}
            {printers.length > 0 && (
              <RadioGroup.Root value={value} onValueChange={(e) => setValue(e.value ?? '')}>
                <VStack align="start" gap={2}>
                  {printers.map((p) => (
                    <RadioGroup.Item key={printerKey(p.deviceId, p.name)} value={printerKey(p.deviceId, p.name)}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>
                        {p.name}
                        <Text as="span" fontSize="xs" color="gray.500" ml={1}>({p.deviceId})</Text>
                      </RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </VStack>
              </RadioGroup.Root>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorPalette="blue" onClick={handleSave} disabled={isLoading || isError}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
