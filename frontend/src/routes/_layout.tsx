import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Accordion, Box, Button, Flex, IconButton, Popover, Text, Tooltip, VStack, HStack } from '@chakra-ui/react'
import { LayoutDashboard, ShoppingCart, Package, Receipt, LogOut, LayoutGrid, Settings, Users, ChefHat, ChevronLeft, ChevronRight, Warehouse, Barcode, ChevronDown, UtensilsCrossed, ArrowLeftRight, FlaskConical, ShoppingBag, Store, ClipboardList, type LucideIcon } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { isRootOrAdmin, canManageMarketplace, canViewOrders, canViewStock } from '../lib/roles'
import { settingsClient } from '../client'
import { BusinessType } from '../gen/wargapos/settings/v1/settings_pb'
import { Toaster } from '../components/ui/toaster'
import { toaster } from '../components/ui/toaster'

// --- Types ---
type NavLeaf  = { label: string; to: string; Icon: LucideIcon; exact?: true }
type NavGroup = { label: string; Icon: LucideIcon; children: NavLeaf[] }
type SidebarEntry = NavLeaf | NavGroup

function isGroup(e: SidebarEntry): e is NavGroup { return 'children' in e }

// --- Static nav items ---
const cafeNavItems: NavLeaf[] = [
  { label: 'Dashboard', to: '/', Icon: LayoutDashboard },
  { label: 'POS', to: '/cafe/pos', Icon: ShoppingCart },
  { label: 'Orders', to: '/cafe/orders', Icon: Receipt },
  { label: 'Kitchen', to: '/cafe/kitchen', Icon: ChefHat },
  { label: 'Settings', to: '/settings', Icon: Settings },
]

const marketplaceNavItems: NavLeaf[] = [
  { label: 'Dashboard', to: '/', Icon: LayoutDashboard },
  { label: 'Shop', to: '/marketplace/shop', Icon: Store },
  { label: 'Orders', to: '/marketplace/orders', Icon: ClipboardList },
  { label: 'Customers', to: '/marketplace/customers', Icon: Users },
  { label: 'Settings', to: '/settings', Icon: Settings },
]

const STORAGE_KEY = 'sidebar-open-groups'

// --- Helpers ---
function SidebarTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>
  return (
    <Tooltip.Root positioning={{ placement: 'right' }}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

function SidebarLeaf({ item, indent = false, collapsed = false }: { item: NavLeaf; indent?: boolean; collapsed?: boolean }) {
  return (
    <SidebarTooltip label={item.label} collapsed={collapsed}>
      <Link to={item.to} activeOptions={item.exact ? { exact: true } : undefined}>
        {({ isActive }) => (
          <HStack
            pl={indent ? 7 : (collapsed ? 0 : 3)} pr={3} py={collapsed ? 2 : 1.5}
            borderRadius="md"
            justify={collapsed ? 'center' : 'flex-start'}
            bg={isActive ? 'blue.50' : 'transparent'}
            color={isActive ? 'blue.600' : 'gray.600'}
            fontWeight={isActive ? 'medium' : 'normal'}
            _hover={{ bg: isActive ? 'blue.50' : 'gray.100' }}
            cursor="pointer"
            fontSize="sm"
            gap={2.5}
          >
            <item.Icon size={indent ? 14 : 16} />
            {!collapsed && <Text whiteSpace="nowrap">{item.label}</Text>}
          </HStack>
        )}
      </Link>
    </SidebarTooltip>
  )
}

// --- Layout ---
export function ProtectedLayout() {
  const { role, logout } = useAuthStore()
  const isAdmin = isRootOrAdmin(role)
  const isAdminOrManager = canManageMarketplace(role) || canViewStock(role)

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsClient.getSettings({}),
    staleTime: 5 * 60 * 1000,
  })
  const businessType = settingsData?.businessType ?? BusinessType.UNSPECIFIED
  const showCafe        = businessType !== BusinessType.MARKETPLACE
  const showMarketplace = businessType !== BusinessType.CAFE

  const baseNav = showCafe ? cafeNavItems : marketplaceNavItems
  const navItems = isAdmin ? [...baseNav, { label: 'Team', to: '/users', Icon: Users }] : baseNav

  const sidebarEntries: SidebarEntry[] = [
    { label: 'Dashboard', to: '/', Icon: LayoutDashboard, exact: true },
    ...(showCafe ? [{
      label: 'Cafe',
      Icon: UtensilsCrossed,
      children: [
        { label: 'POS / Cashier', to: '/cafe/pos', Icon: ShoppingCart },
        { label: 'Orders', to: '/cafe/orders', Icon: Receipt },
        { label: 'Kitchen', to: '/cafe/kitchen', Icon: ChefHat },
        { label: 'Tables', to: '/cafe/tables', Icon: LayoutGrid },
        { label: 'Products', to: '/cafe/products', Icon: Package, exact: true as const },
        { label: 'Ingredients', to: '/cafe/ingredients', Icon: FlaskConical },
      ],
    }] : []),
    ...((canManageMarketplace(role) || canViewOrders(role)) && showMarketplace ? [{
      label: 'Marketplace',
      Icon: ShoppingBag,
      children: [
        ...(canManageMarketplace(role) ? [{ label: 'Shop', to: '/marketplace/shop', Icon: Store }] : []),
        ...(canManageMarketplace(role) ? [{ label: 'Products', to: '/marketplace/products', Icon: Package }] : []),
        { label: 'Orders',    to: '/marketplace/orders',    Icon: ClipboardList },
        ...(canManageMarketplace(role) ? [{ label: 'Customers', to: '/marketplace/customers', Icon: Users }] : []),
      ],
    }] : []),
    ...(canViewStock(role) ? [{
      label: 'Stock',
      Icon: Warehouse,
      children: [
        { label: 'Warehouses', to: '/stock', Icon: Warehouse, exact: true as const },
        { label: 'SKUs', to: '/stock/skus', Icon: Barcode },
        { label: 'Transactions', to: '/stock/transactions', Icon: ArrowLeftRight },
      ],
    }] : []),
    ...(isAdmin ? [{ label: 'Team', to: '/users', Icon: Users }] : []),
    { label: 'Settings', to: '/settings', Icon: Settings },
  ]

  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [collapsed, setCollapsed] = useState(false)

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
    catch { return [] }
  })

  function handleGroupChange(value: string[]) {
    setOpenGroups(value)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  }

  // Auto-expand group when a child route is active
  useEffect(() => {
    const activeGroups = sidebarEntries
      .filter(isGroup)
      .filter((g) => g.children.some((c) => c.exact ? pathname === c.to : pathname.startsWith(c.to)))
      .map((g) => g.label)
    if (activeGroups.some((g) => !openGroups.includes(g))) {
      setOpenGroups((prev) => [...new Set([...prev, ...activeGroups])])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function handleLogout() {
    logout()
    navigate({ to: '/login' })
    toaster.create({ title: 'Logged out', type: 'info', duration: 2000 })
  }

  return (
    <Flex h="100vh" direction="column">
      {/* Mobile top header */}
      <Flex
        className="layout-nav"
        display={{ base: 'flex', md: 'none' }}
        h="48px"
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        px={4}
        justify="space-between"
        flexShrink={0}
      >
        <HStack gap={2}>
          <ShoppingCart size={18} color="#3b82f6" />
          <Text fontWeight="bold" fontSize="md">WargaPOS</Text>
        </HStack>
        <HStack gap={1}>
          <IconButton aria-label="Logout" variant="ghost" size="sm" colorPalette="red" onClick={handleLogout}>
            <LogOut size={18} />
          </IconButton>
        </HStack>
      </Flex>

      <Flex flex={1} overflow="hidden">
        {/* Sidebar — desktop only */}
        <Flex
          className="layout-nav"
          display={{ base: 'none', md: 'flex' }}
          direction="column"
          w={collapsed ? '60px' : '220px'}
          transition="width 0.2s ease"
          bg="white"
          borderRight="1px solid"
          borderColor="gray.200"
          py={6}
          px={collapsed ? 2 : 4}
          flexShrink={0}
          h="full"
          overflow="hidden"
        >
          {/* Logo */}
          <HStack gap={2} mb={8} px={2} justify={collapsed ? 'center' : 'space-between'}>
            <HStack gap={2}>
              <ShoppingCart size={20} color="#3b82f6" />
              {!collapsed && <Text fontWeight="bold" fontSize="lg" whiteSpace="nowrap">WargaPOS</Text>}
            </HStack>
          </HStack>

          {/* Nav items */}
          <VStack align="stretch" gap={1} flex={1} overflow="hidden">
            {collapsed ? (
              // Icon-only mode: flat leaves + popover for groups
              sidebarEntries.map((entry) =>
                isGroup(entry) ? (
                  <Popover.Root key={entry.label} positioning={{ placement: 'right-start' }}>
                    <Popover.Trigger asChild>
                      <IconButton
                        aria-label={entry.label}
                        variant="ghost"
                        size="sm"
                        w="full"
                        colorPalette="gray"
                      >
                        <entry.Icon size={16} />
                      </IconButton>
                    </Popover.Trigger>
                    <Popover.Positioner>
                      <Popover.Content w="160px" p={2}>
                        <VStack gap={1} align="stretch">
                          {entry.children.map((child) => (
                            <SidebarLeaf key={child.to} item={child} />
                          ))}
                        </VStack>
                      </Popover.Content>
                    </Popover.Positioner>
                  </Popover.Root>
                ) : (
                  <SidebarLeaf key={entry.to} item={entry} collapsed />
                )
              )
            ) : (
              // Expanded mode: accordion for groups, flat for leaves
              <Accordion.Root
                value={openGroups}
                onValueChange={(d) => handleGroupChange(d.value)}
                w="full"
              >
                {sidebarEntries.map((entry) =>
                  isGroup(entry) ? (
                    <Accordion.Item key={entry.label} value={entry.label} border="none">
                      <Accordion.ItemTrigger asChild>
                        <HStack
                          px={3}
                          py={2}
                          borderRadius="md"
                          cursor="pointer"
                          _hover={{ bg: 'gray.100' }}
                          color="gray.600"
                          fontSize="sm"
                          gap={2.5}
                          w="full"
                          as="button"
                        >
                          <entry.Icon size={16} />
                          <Text flex={1} textAlign="left" whiteSpace="nowrap">{entry.label}</Text>
                          <Accordion.ItemIndicator>
                            <ChevronDown size={12} />
                          </Accordion.ItemIndicator>
                        </HStack>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent>
                        <VStack gap={0.5} align="stretch" pb={1}>
                          {entry.children.map((child) => (
                            <SidebarLeaf key={child.to} item={child} indent />
                          ))}
                        </VStack>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  ) : (
                    <SidebarLeaf key={entry.to} item={entry} />
                  )
                )}
              </Accordion.Root>
            )}
          </VStack>

          {/* Collapse toggle */}
          <Box pb={2} display="flex" justifyContent={collapsed ? 'center' : 'flex-end'}>
            <IconButton
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              variant="ghost"
              size="xs"
              colorPalette="gray"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </IconButton>
          </Box>

          {/* Role + logout */}
          <Box pt={4} borderTop="1px solid" borderColor="gray.200">
            {!collapsed && (
              <Text fontSize="xs" color="gray.500" mb={2} px={2}>Role: {role ?? '—'}</Text>
            )}
            <SidebarTooltip label="Logout" collapsed={collapsed}>
              {collapsed ? (
                <IconButton
                  aria-label="Logout"
                  variant="ghost"
                  colorPalette="red"
                  size="sm"
                  width="full"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                </IconButton>
              ) : (
                <Button size="sm" variant="ghost" colorPalette="red" width="full" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </Button>
              )}
            </SidebarTooltip>
          </Box>
        </Flex>

        {/* Main content */}
        <Box flex={1} bg="gray.50" overflow="auto" pb={{ base: '64px', md: 0 }}>
          <Outlet />
        </Box>
      </Flex>

      {/* Bottom nav — mobile only */}
      <Box
        className="layout-nav"
        display={{ base: 'flex', md: 'none' }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        h="64px"
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        zIndex={100}
      >
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} style={{ flex: 1 }}>
            {({ isActive }) => (
              <Flex
                direction="column"
                align="center"
                justify="center"
                h="full"
                gap={0.5}
                color={isActive ? 'blue.500' : 'gray.400'}
              >
                <item.Icon size={20} />
                <Text fontSize="10px">{item.label}</Text>
              </Flex>
            )}
          </Link>
        ))}
      </Box>

      <Toaster />
    </Flex>
  )
}
