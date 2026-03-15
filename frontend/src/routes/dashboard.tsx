import { Box, Heading, HStack, Text } from '@chakra-ui/react'
import { ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../store/auth'

export function DashboardPage() {
  const { role } = useAuthStore()

  return (
    <Box p={{ base: 4, md: 8 }} maxW="480px">
      <HStack gap={2} mb={1}>
        <ShoppingCart size={22} color="#3b82f6" />
        <Heading size={{ base: 'md', md: 'lg' }}>WargaPOS</Heading>
      </HStack>
      <Text color="gray.500" mb={6} fontSize="sm">Welcome back · {role}</Text>

      <Text color="gray.600" fontSize="sm" lineHeight="tall">
        A point-of-sale system for cafes. Manage products and categories, take orders at the
        cashier, track tables, and accept cash or online payments via Midtrans. Guests can
        browse the menu and order directly from their table.
      </Text>
    </Box>
  )
}
