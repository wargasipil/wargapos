import { createRouter, createRoute, createRootRoute, redirect, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useAuthStore } from './store/auth'
import { isRootOrAdmin, canManageProducts, canViewStock, canManageMarketplace, canViewOrders, canViewTransactions } from './lib/roles'

import { ProtectedLayout } from './routes/_layout'
import { LoginPage } from './routes/login'
import { DashboardPage } from './routes/dashboard'
import { PosPage } from './routes/cafe/pos/index'
import { ProductsPage } from './routes/cafe/products'
import { ProductNewPage } from './routes/cafe/products/new'
import { ProductEditPage } from './routes/cafe/products/edit'
import { TablesPage } from './routes/cafe/tables/index'
import { MenuPage } from './routes/menu'
import { OrdersPage } from './routes/cafe/orders/index'
import { OrderDetailPage } from './routes/cafe/orders/detail'
import { ProductDetailPage } from './routes/cafe/products/detail'
import { SettingsPage } from './routes/settings'
import { UsersPage } from './routes/users/index'
import { KitchenPage } from './routes/cafe/kitchen'
import { PlaygroundPage } from './routes/playground'
import { SetupPage } from './routes/setup'
import { PrintPage } from './routes/print'
import { WarehousesPage } from './routes/stock/index'
import { SkusPage } from './routes/stock/skus/index'
import { SkuDetail } from './routes/stock/skus/Detail'
import { WarehouseDetailPage } from './routes/stock/warehouses/Detail'
import { TransactionsPage } from './routes/stock/transactions'
import { TransactionDetailPage } from './routes/stock/transactions/Detail'
import { PlacementPage } from './routes/stock/placement/index'
import { RackDetailPage } from './routes/stock/placement/Detail'
import { RackAdjustPage } from './routes/stock/placement/Adjust'
import { IngredientsPage } from './routes/cafe/ingredients/index'
import { ShopListingPage } from './routes/marketplace/shop/index'
import { ShopListingNewPage } from './routes/marketplace/shop/new'
import { ShopListingEditPage } from './routes/marketplace/shop/edit'
import { ShopDetailPage } from './routes/marketplace/shop/detail'
import { MarketplaceOrdersPage } from './routes/marketplace/orders/index'
import { MarketplaceOrderDetailPage } from './routes/marketplace/orders/detail'
import { MarketplaceProductsPage } from './routes/marketplace/products/index'
import { MarketplaceProductNewPage } from './routes/marketplace/products/new'
import { MarketplaceProductEditPage } from './routes/marketplace/products/edit'
import { MarketplaceProductDetailPage } from './routes/marketplace/products/detail'
import { MarketplaceOrderNewPage } from './routes/marketplace/orders/new'
import { MarketplaceCustomersPage } from './routes/marketplace/customers/index'
import { MarketplaceCustomerNewPage } from './routes/marketplace/customers/new'
import { MarketplaceCustomerEditPage } from './routes/marketplace/customers/edit'
import { MarketplaceCustomerDetailPage } from './routes/marketplace/customers/detail'

async function checkSetupNeeded(): Promise<boolean> {
  try {
    const res = await fetch('/setup-needed')
    const data: { needed: boolean } = await res.json()
    return data.needed
  } catch {
    return false
  }
}

// Root route with devtools
const rootRoute = createRootRoute({
  component: () => {
    const isPrint = useRouterState({ select: (s) => s.location.pathname === '/print' })
    return (
      <>
        <Outlet />
        {!isPrint && <TanStackRouterDevtools />}
      </>
    )
  },
})

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: async () => {
    if (await checkSetupNeeded()) throw redirect({ to: '/setup' })
  },
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupPage,
  beforeLoad: async () => {
    if (!(await checkSetupNeeded())) throw redirect({ to: '/login' })
  },
})

const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/menu',
  component: MenuPage,
})

const printRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/print',
  component: PrintPage,
})

// Protected layout — redirects to /login if no token
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
  beforeLoad: () => {
    const { token } = useAuthStore.getState()
    if (!token) throw redirect({ to: '/login' })
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: DashboardPage,
})

const posRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/pos',
  component: PosPage,
})

const productsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/products',
  component: ProductsPage,
})

const productNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/products/new',
  component: ProductNewPage,
})

const productEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/products/$id/edit',
  component: ProductEditPage,
})

const productDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/products/$id',
  component: ProductDetailPage,
})

const tablesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/tables',
  component: TablesPage,
})

const ordersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/orders',
  component: OrdersPage,
})

const orderDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/orders/$id',
  component: OrderDetailPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: SettingsPage,
})

const kitchenRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/kitchen',
  component: KitchenPage,
})

const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/users',
  component: UsersPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!isRootOrAdmin(role)) throw redirect({ to: '/' })
  },
})

const stockRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock',
  component: WarehousesPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const skuRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/skus',
  component: SkusPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const transactionRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/transactions',
  component: TransactionsPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const warehouseDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/warehouses/$id',
  component: WarehouseDetailPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const skuDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/skus/$id',
  component: SkuDetail,
})

const transactionDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/transactions/$id',
  component: TransactionDetailPage,
})

const placementRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/placement',
  component: PlacementPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const rackDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/placement/$id',
  component: RackDetailPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const rackAdjustRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stock/placement/$id/adjust',
  component: RackAdjustPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewStock(role)) throw redirect({ to: '/' })
  },
})

const ingredientsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/cafe/ingredients',
  component: IngredientsPage,
})

const marketplaceShopRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/shop',
  component: ShopListingPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!isRootOrAdmin(role)) throw redirect({ to: '/' })
  },
})

const marketplaceShopNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/shop/new',
  component: ShopListingNewPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!isRootOrAdmin(role)) throw redirect({ to: '/' })
  },
})

const marketplaceShopEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/shop/$id/edit',
  component: ShopListingEditPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!isRootOrAdmin(role)) throw redirect({ to: '/' })
  },
})

const marketplaceShopDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/shop/$id',
  component: ShopDetailPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!isRootOrAdmin(role)) throw redirect({ to: '/' })
  },
})

const marketplaceOrdersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/orders',
  component: MarketplaceOrdersPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewOrders(role)) throw redirect({ to: '/' })
  },
})

const marketplaceOrderNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/orders/new',
  component: MarketplaceOrderNewPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceOrderDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/orders/$id',
  component: MarketplaceOrderDetailPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canViewOrders(role)) throw redirect({ to: '/' })
  },
})

const marketplaceProductsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/products',
  component: MarketplaceProductsPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceProductNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/products/new',
  component: MarketplaceProductNewPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceProductEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/products/$id/edit',
  component: MarketplaceProductEditPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceProductDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/products/$id',
  component: MarketplaceProductDetailPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceCustomersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/customers',
  component: MarketplaceCustomersPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceCustomerNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/customers/new',
  component: MarketplaceCustomerNewPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceCustomerEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/customers/$id/edit',
  component: MarketplaceCustomerEditPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const marketplaceCustomerDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/marketplace/customers/$id',
  component: MarketplaceCustomerDetailPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canManageMarketplace(role)) throw redirect({ to: '/' })
  },
})

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playground',
  component: PlaygroundPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  setupRoute,
  menuRoute,
  printRoute,
  playgroundRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    posRoute,
    productsRoute,
    productNewRoute,
    productEditRoute,
    tablesRoute,
    ordersRoute,
    orderDetailRoute,
    kitchenRoute,
    productDetailRoute,
    settingsRoute,
    usersRoute,
    stockRoute,
    warehouseDetailRoute,
    skuRoute,
    skuDetailRoute,
    transactionRoute,
    transactionDetailRoute,
    placementRoute,
    rackDetailRoute,
    rackAdjustRoute,
    ingredientsRoute,
    marketplaceShopRoute,
    marketplaceShopNewRoute,
    marketplaceShopEditRoute,
    marketplaceShopDetailRoute,
    marketplaceOrdersRoute,
    marketplaceOrderNewRoute,
    marketplaceOrderDetailRoute,
    marketplaceProductsRoute,
    marketplaceProductNewRoute,
    marketplaceProductEditRoute,
    marketplaceProductDetailRoute,
    marketplaceCustomersRoute,
    marketplaceCustomerNewRoute,
    marketplaceCustomerEditRoute,
    marketplaceCustomerDetailRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
