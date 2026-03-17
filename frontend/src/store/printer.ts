import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectedPrinter {
  deviceId: string
  name: string
}

interface PrinterState {
  selectedPrinter: SelectedPrinter | null
  setSelectedPrinter: (printer: SelectedPrinter | null) => void
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      selectedPrinter: null,
      setSelectedPrinter: (printer) => set({ selectedPrinter: printer }),
    }),
    { name: 'wargapos-printer' }
  )
)
