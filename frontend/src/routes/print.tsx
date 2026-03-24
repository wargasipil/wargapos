import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { Printer } from 'lucide-react'
import type { BrowserReceiptPayload } from '../lib/printer'

const COLS = 32

function sep() {
  return '-'.repeat(COLS)
}

function rowLR(left: string, right: string): string {
  const gap = COLS - left.length - right.length
  return left + ' '.repeat(Math.max(1, gap)) + right
}

function decode(data: string): BrowserReceiptPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(data)))
    return JSON.parse(json) as BrowserReceiptPayload
  } catch {
    return null
  }
}

export function PrintPage() {
  const params = new URLSearchParams(window.location.search)
  const payload = decode(params.get('data') ?? '')

  if (!payload) {
    return <Box p={6}><Text>Invalid print data.</Text></Box>
  }

  const title = payload.opts.title || 'WargaPOS'
  const description = payload.opts.description || 'Café Point of Sale'
  const footer = payload.opts.footer || 'Terima kasih!'

  return (
    <Box minH="100svh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" p={4}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt {
            position: absolute;
            top: 0;
            left: 0;
            width: 58mm;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <VStack gap={4} w="full" maxW="320px">
        <HStack className="no-print" gap={2} w="full">
          <Button flex={1} colorPalette="blue" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </Button>
          <Button flex={1} variant="outline" onClick={() => window.close()}>
            Tutup
          </Button>
        </HStack>

        <Box
          id="receipt"
          fontFamily="monospace"
          fontSize="12px"
          lineHeight="1.4"
          bg="white"
          p={4}
          w="full"
          whiteSpace="pre"
        >
          <Text textAlign="center" fontWeight="bold" whiteSpace="pre-wrap">{title}</Text>
          <Text textAlign="center" whiteSpace="pre-wrap">{description}</Text>
          {payload.opts.address  && <Text textAlign="center" whiteSpace="pre-wrap">{payload.opts.address}</Text>}
          {payload.opts.address2 && <Text textAlign="center" whiteSpace="pre-wrap">{payload.opts.address2}</Text>}
          {payload.opts.contact  && <Text textAlign="center" whiteSpace="pre-wrap">{payload.opts.contact}</Text>}
          <Text>{sep()}</Text>
          <Text fontWeight="bold">Order  : #{payload.orderId}</Text>
          <Text>Date   : {payload.dateStr}</Text>
          <Text>Table  : {payload.tableName}</Text>
          <Text>Payment: {payload.paymentLabel}</Text>
          {payload.customerName && <Text>Name   : {payload.customerName}</Text>}
          {payload.phoneNumber  && <Text>Phone  : {payload.phoneNumber}</Text>}
          <Text>{sep()}</Text>
          {payload.items.map((item, i) => (
            <Box key={i}>
              <Text>{rowLR(item.productName.slice(0, 20), item.subtotalStr)}</Text>
              <Text>  {item.qty} x {item.unitPriceStr}</Text>
              {item.notes && <Text>  * {item.notes.slice(0, COLS - 4)}</Text>}
            </Box>
          ))}
          <Text>{sep()}</Text>
          <Text fontWeight="bold">{rowLR('TOTAL', payload.totalStr)}</Text>
          {payload.showCash && (
            <>
              <Text>{rowLR('Tunai', payload.cashTenderedStr ?? '')}</Text>
              <Text>{rowLR('Kembalian', payload.changeStr ?? '')}</Text>
            </>
          )}
          <Text>{sep()}</Text>
          <Text textAlign="center" whiteSpace="pre-wrap">{footer}</Text>
        </Box>
      </VStack>
    </Box>
  )
}
