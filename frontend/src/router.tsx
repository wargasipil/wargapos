import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useAuthStore } from './store/auth'

import { ProtectedLayout } from './routes/_layout'
import { LoginPage } from './routes/login'
import { DashboardPage } from './routes/dashboard'
import { PosPage } from './routes/pos/index'
import { ProductsPage } from './routes/products'
import { ProductNewPage } from './routes/products/new'
import { ProductEditPage } from './routes/products/edit'
import { TablesPage } from './routes/tables/index'
import { MenuPage } from './routes/menu'
import { OrdersPage } from './routes/orders/index'
import { OrderDetailPage } from './routes/orders/detail'
import { ProductDetailPage } from './routes/products/detail'
import { SettingsPage } from './routes/settings'
import { UsersPage } from './routes/users/index'
import { KitchenPage } from './routes/kitchen'
import { PlaygroundPage } from './routes/playground'
import { SetupPage } from './routes/setup'

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
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
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
  path: '/pos',
  component: PosPage,
})

const productsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/products',
  component: ProductsPage,
})

const productNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/products/new',
  component: ProductNewPage,
})

const productEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/products/$id/edit',
  component: ProductEditPage,
})

const productDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/products/$id',
  component: ProductDetailPage,
})

const tablesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/tables',
  component: TablesPage,
})

const ordersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/orders',
  component: OrdersPage,
})

const orderDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/orders/$id',
  component: OrderDetailPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: SettingsPage,
})

const kitchenRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/kitchen',
  component: KitchenPage,
})

const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/users',
  component: UsersPage,
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (role !== 'admin') throw redirect({ to: '/' })
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
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
