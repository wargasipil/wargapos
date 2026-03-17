import { Outlet, Link, useNavigate } from '@tanstack/react-router'
import { Box, Button, Flex, IconButton, Text, VStack, HStack } from '@chakra-ui/react'
import { LayoutDashboard, ShoppingCart, Package, Receipt, LogOut, LayoutGrid, Settings, Users, ChefHat } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { Toaster } from '../components/ui/toaster'

const baseNavItems = [
  { label: 'Dashboard', to: '/', Icon: LayoutDashboard },
  { label: 'POS', to: '/pos', Icon: ShoppingCart },
  { label: 'Orders', to: '/orders', Icon: Receipt },
  { label: 'Kitchen', to: '/kitchen', Icon: ChefHat },
  { label: 'Settings', to: '/settings', Icon: Settings },
]

const baseSidebarItems = [
  { label: 'Dashboard', to: '/', Icon: LayoutDashboard, exact: true },
  { label: 'POS / Cashier', to: '/pos', Icon: ShoppingCart },
  { label: 'Orders', to: '/orders', Icon: Receipt },
  { label: 'Kitchen', to: '/kitchen', Icon: ChefHat },
  { label: 'Products', to: '/products', Icon: Package, exact: true },
  { label: 'Tables', to: '/tables', Icon: LayoutGrid },
  { label: 'Settings', to: '/settings', Icon: Settings },
]

export function ProtectedLayout() {
  const { role, logout } = useAuthStore()
  const isAdmin = role === 'admin'
  const navItems = isAdmin ? [...baseNavItems, { label: 'Team', to: '/users', Icon: Users }] : baseNavItems
  const sidebarItems = isAdmin ? [...baseSidebarItems, { label: 'Team', to: '/users', Icon: Users }] : baseSidebarItems
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate({ to: '/login' })
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
        <IconButton aria-label="Logout" variant="ghost" size="sm" colorPalette="red" onClick={handleLogout}>
          <LogOut size={18} />
        </IconButton>
      </Flex>

      <Flex flex={1} overflow="hidden">
        {/* Sidebar — desktop only */}
        <Flex
          className="layout-nav"
          display={{ base: 'none', md: 'flex' }}
          direction="column"
          w="220px"
          bg="white"
          borderRight="1px solid"
          borderColor="gray.200"
          py={6}
          px={4}
          flexShrink={0}
          h="full"
        >
          <HStack gap={2} mb={8} px={2}>
            <ShoppingCart size={20} color="#3b82f6" />
            <Text fontWeight="bold" fontSize="lg">WargaPOS</Text>
          </HStack>
          <VStack align="stretch" gap={1} flex={1}>
            {sidebarItems.map((item) => (
              <Link key={item.to} to={item.to} activeOptions={item.exact ? { exact: true } : undefined}>
                {({ isActive }) => (
                  <HStack
                    px={3}
                    py={2}
                    borderRadius="md"
                    bg={isActive ? 'blue.50' : 'transparent'}
                    color={isActive ? 'blue.600' : 'gray.600'}
                    fontWeight={isActive ? 'medium' : 'normal'}
                    _hover={{ bg: isActive ? 'blue.50' : 'gray.100' }}
                    cursor="pointer"
                    fontSize="sm"
                    gap={2.5}
                  >
                    <item.Icon size={16} />
                    <Text>{item.label}</Text>
                  </HStack>
                )}
              </Link>
            ))}
          </VStack>
          <Box pt={4} borderTop="1px solid" borderColor="gray.200">
            <Text fontSize="xs" color="gray.500" mb={2} px={2}>Role: {role ?? '—'}</Text>
            <Button size="sm" variant="ghost" colorPalette="red" width="full" onClick={handleLogout}>
              <LogOut size={14} />
              Logout
            </Button>
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
