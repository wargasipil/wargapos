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
import { ProductDetailPage } from './routes/products/detail'
import { SettingsPage } from './routes/settings'
import { UsersPage } from './routes/users/index'

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

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: SettingsPage,
})

const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/users',
  component: UsersPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  menuRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    posRoute,
    productsRoute,
    productNewRoute,
    productEditRoute,
    tablesRoute,
    ordersRoute,
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
