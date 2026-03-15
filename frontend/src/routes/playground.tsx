import { Box, Button, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'

// ESC/POS test bytes — prints "PRINTER TEST" and cuts
const TEST_BYTES = new Uint8Array([
  0x1b, 0x40,              // ESC @ — initialize
  0x1b, 0x61, 0x01,       // ESC a 1 — center
  0x1b, 0x45, 0x01,       // ESC E 1 — bold on
  ...Array.from('PRINTER TEST\n').map(c => c.charCodeAt(0)),
  0x1b, 0x45, 0x00,       // ESC E 0 — bold off
  0x1b, 0x61, 0x00,       // ESC a 0 — left
  ...Array.from('WebUSB OK\n').map(c => c.charCodeAt(0)),
  0x0a, 0x0a, 0x0a,       // 3x feed
  0x1d, 0x56, 0x00,       // GS V 0 — cut
])

async function testPrinter(): Promise<string[]> {
  const logs: string[] = []

  // Must be called from a user gesture (button click) — not useEffect
  const device = await navigator.usb.requestDevice({ filters: [] })
  logs.push(`${device.deviceClass} Connected: ${device.productName} (vendor 0x${device.vendorId.toString(16)})`)

  await device.open()
  logs.push('Opened')

  if (device.configuration === null) {
    await device.selectConfiguration(1)
    logs.push('Selected configuration 1')
  }

  const iface = device.configuration!.interfaces[0]
  await device.claimInterface(iface.interfaceNumber)
  logs.push(`Claimed interface ${iface.interfaceNumber}`)

  const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out')
  if (!endpoint) throw new Error('No OUT endpoint found')
  logs.push(`OUT endpoint: ${endpoint.endpointNumber}`)

  await device.transferOut(endpoint.endpointNumber, TEST_BYTES)
  logs.push(`Sent ${TEST_BYTES.length} bytes`)

  await device.releaseInterface(iface.interfaceNumber)
  await device.close()
  logs.push('Done')

  return logs
}

export function PlaygroundPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTest() {
    setLogs([])
    setError(null)
    setLoading(true)
    try {
      const result = await testPrinter()
      setLogs(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={8} maxW="480px">
      <Heading size="lg" mb={6}>Printer Playground</Heading>

      <Button onClick={handleTest} loading={loading} colorPalette="blue" mb={2}>
        Test Print
      </Button>
      <Text fontSize="xs" color="gray.400" mb={4}>
        Browser will show ALL USB devices — select your thermal printer from the list.
      </Text>

      {error && (
        <Text color="red.500" mb={3}>{error}</Text>
      )}

      {logs.length > 0 && (
        <VStack align="stretch" gap={1}>
          {logs.map((l, i) => (
            <Code key={i} fontSize="sm" p={1}>{l}</Code>
          ))}
        </VStack>
      )}
    </Box>
  )
}
