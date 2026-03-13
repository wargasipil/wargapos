import { Outlet, Link, useNavigate } from '@tanstack/react-router'
import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react'
import { useAuthStore } from '../store/auth'

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'POS / Cashier', to: '/pos' },
  { label: 'Products', to: '/products' },
  { label: 'Categories', to: '/products/categories' },
]

export function ProtectedLayout() {
  const { role, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Flex h="100vh">
      {/* Sidebar */}
      <Flex
        direction="column"
        w="220px"
        bg="gray.900"
        color="white"
        py={6}
        px={4}
        flexShrink={0}
        h="full"
      >
        <Text fontWeight="bold" fontSize="lg" mb={8} px={2}>
          WargaPOS
        </Text>
        <VStack align="stretch" gap={1} flex={1}>
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {({ isActive }) => (
                <Box
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={isActive ? 'blue.600' : 'transparent'}
                  _hover={{ bg: isActive ? 'blue.600' : 'whiteAlpha.200' }}
                  cursor="pointer"
                  fontSize="sm"
                >
                  {item.label}
                </Box>
              )}
            </Link>
          ))}
        </VStack>
        <Box pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Text fontSize="xs" color="gray.400" mb={2} px={2}>
            Role: {role ?? '—'}
          </Text>
          <Button size="sm" variant="ghost" colorPalette="red" width="full" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Flex>

      {/* Main content */}
      <Box flex={1} bg="gray.50" overflow="auto">
        <Outlet />
      </Box>
    </Flex>
  )
}
