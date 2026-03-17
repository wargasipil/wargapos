import { create } from 'zustand'

export interface CartItem {
  productId: bigint
  name: string
  qty: number
  unitPriceCents: bigint
  notes: string
}

interface CartState {
  sessionId: string
  items: CartItem[]
  totalCents: bigint
  addItem: (item: Omit<CartItem, 'qty' | 'notes'>) => void
  removeItem: (productId: bigint) => void
  updateNotes: (productId: bigint, notes: string) => void
  clear: () => void
}

function newSessionId() {
  return crypto.randomUUID()
}

function calcTotal(items: CartItem[]): bigint {
  return items.reduce((sum, i) => sum + i.unitPriceCents * BigInt(i.qty), 0n)
}

export const useCartStore = create<CartState>()((set) => ({
  sessionId: newSessionId(),
  items: [],
  totalCents: 0n,
  addItem: (newItem) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === newItem.productId)
      const items = existing
        ? state.items.map((i) =>
            i.productId === newItem.productId ? { ...i, qty: i.qty + 1 } : i
          )
        : [...state.items, { ...newItem, qty: 1, notes: '' }]
      return { items, totalCents: calcTotal(items) }
    }),
  removeItem: (productId) =>
    set((state) => {
      const items = state.items
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
      return { items, totalCents: calcTotal(items) }
    }),
  updateNotes: (productId, notes) =>
    set((state) => ({
      items: state.items.map((i) => i.productId === productId ? { ...i, notes } : i),
    })),
  clear: () => set({ items: [], totalCents: 0n, sessionId: newSessionId() }),
}))
