import { Box, Card, Grid, HStack, Heading, Text } from '@chakra-ui/react'
import { LayoutDashboard, Clock, CheckCircle2, Package, LayoutGrid } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { transactionClient, productClient, tableClient } from '../client'

export function DashboardPage() {
  const { role } = useAuthStore()

  const { data: pendingData } = useQuery({
    queryKey: ['orders-pending'],
    queryFn: () => transactionClient.listOrders({ page: 1, pageSize: 1, statusFilter: 'pending', cashierId: 0n, tableId: 0n }),
  })
  const { data: paidData } = useQuery({
    queryKey: ['orders-paid'],
    queryFn: () => transactionClient.listOrders({ page: 1, pageSize: 1, statusFilter: 'paid', cashierId: 0n, tableId: 0n }),
  })
  const { data: productsData } = useQuery({
    queryKey: ['products-count'],
    queryFn: () => productClient.listProducts({ page: 1, pageSize: 1, categoryId: 0n }),
  })
  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableClient.listTables({}),
  })

  const stats = [
    { label: 'Pending Orders',   value: pendingData?.total ?? '—',        Icon: Clock,        color: 'orange' },
    { label: 'Completed Orders', value: paidData?.total ?? '—',           Icon: CheckCircle2, color: 'green'  },
    { label: 'Products',         value: productsData?.total ?? '—',       Icon: Package,      color: 'blue'   },
    { label: 'Tables',           value: tablesData?.tables.length ?? '—', Icon: LayoutGrid,   color: 'purple' },
  ]

  return (
    <Box p={{ base: 4, md: 8 }}>
      <HStack gap={2} mb={1}>
        <LayoutDashboard size={22} />
        <Heading size={{ base: 'md', md: 'lg' }}>Dashboard</Heading>
      </HStack>
      <Text color="gray.500" mb={6} fontSize="sm">Welcome back · {role}</Text>

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={{ base: 3, md: 6 }}>
        {stats.map((s) => (
          <Card.Root key={s.label}>
            <Card.Body p={{ base: 3, md: 5 }}>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" color="gray.500">{s.label}</Text>
                <Box color={`${s.color}.500`}><s.Icon size={18} /></Box>
              </HStack>
              <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">{String(s.value)}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>
    </Box>
  )
}
