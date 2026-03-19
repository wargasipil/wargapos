import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectedPrinter {
  deviceId: string
  name: string
}

interface PrinterState {
  selectedPrinters: SelectedPrinter[]
  setSelectedPrinters: (printers: SelectedPrinter[]) => void
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      selectedPrinters: [],
      setSelectedPrinters: (printers) => set({ selectedPrinters: printers }),
    }),
    { name: 'wargapos-printer' }
  )
)
