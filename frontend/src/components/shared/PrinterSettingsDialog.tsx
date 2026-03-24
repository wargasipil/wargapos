import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Checkbox, Dialog, Spinner, Text, VStack } from '@chakra-ui/react'
import { deviceClient, settingsClient } from '../../client'
import { usePrinterStore } from '../../store/printer'
import { PrintMode } from '../../gen/wargapos/settings/v1/settings_pb'

interface Props {
  open: boolean
  onClose: () => void
}

function printerKey(deviceId: string, name: string) {
  return `${deviceId}:${name}`
}

export function PrinterSettingsDialog({ open, onClose }: Props) {
  const { selectedPrinters, setSelectedPrinters } = usePrinterStore()
  const [values, setValues] = useState<string[]>(
    selectedPrinters.map((p) => printerKey(p.deviceId, p.name))
  )

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsClient.getSettings({}),
    staleTime: 60_000,
  })

  const isBrowserMode = settingsData?.printer?.printMode === PrintMode.BROWSER

  const { data, isLoading, isError } = useQuery({
    queryKey: ['device-printers'],
    queryFn: () => deviceClient.listPrinters({}),
    enabled: open && !isBrowserMode,
    retry: false,
  })

  const printers = data?.printers ?? []

  function toggle(key: string) {
    setValues((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function handleSave() {
    const selected = printers
      .filter((p) => values.includes(printerKey(p.deviceId, p.name)))
      .map((p) => ({ deviceId: p.deviceId, name: p.name }))
    setSelectedPrinters(selected)
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
            {isBrowserMode ? (
              <Text color="gray.500" fontSize="sm">
                Mode browser aktif — tidak perlu memilih printer.
              </Text>
            ) : (
              <>
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
              <VStack align="start" gap={2}>
                {printers.map((p) => {
                  const key = printerKey(p.deviceId, p.name)
                  return (
                    <Checkbox.Root
                      key={key}
                      checked={values.includes(key)}
                      onCheckedChange={() => toggle(key)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        {p.name}
                        <Text as="span" fontSize="xs" color="gray.500" ml={1}>({p.deviceId})</Text>
                      </Checkbox.Label>
                    </Checkbox.Root>
                  )
                })}
              </VStack>
            )}
              </>
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
