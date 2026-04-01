export const ROLES = {
  ROOT: 'root',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  CASHIER: 'cashier',
  WAREHOUSE_ADMIN: 'warehouse_admin',
  WAREHOUSE_MEMBER: 'warehouse_member',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const isRootOrAdmin        = (r: string | null) => r === 'root' || r === 'admin'
export const canManageProducts    = (r: string | null) => r === 'root' || r === 'admin' || r === 'warehouse_admin'
export const canManageStock       = (r: string | null) => r === 'root' || r === 'admin' || r === 'warehouse_admin'
export const canViewStock         = (r: string | null) => canManageStock(r) || r === 'warehouse_member' || r === 'cashier'
export const canManageMarketplace = (r: string | null) => r === 'root' || r === 'admin' || r === 'warehouse_admin'
export const canViewOrders        = (r: string | null) => canManageMarketplace(r) || r === 'accountant'
export const canViewTransactions  = (r: string | null) => r === 'root' || r === 'admin' || r === 'accountant' || r === 'cashier'
