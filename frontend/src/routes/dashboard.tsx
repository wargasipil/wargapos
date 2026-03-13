import { Box, Card, Grid, Heading, Text } from '@chakra-ui/react'
import { useAuthStore } from '../store/auth'

const stats = [
  { label: 'Total Orders Today', value: '—' },
  { label: 'Total Products', value: '—' },
  { label: 'Revenue Today', value: '—' },
]

export function DashboardPage() {
  const { role } = useAuthStore()

  return (
    <Box p={8}>
      <Heading size="lg" mb={2}>Dashboard</Heading>
      <Text color="gray.500" mb={8}>Welcome back · {role}</Text>

      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {stats.map((s) => (
          <Card.Root key={s.label}>
            <Card.Body>
              <Text fontSize="sm" color="gray.500" mb={2}>{s.label}</Text>
              <Text fontSize="2xl" fontWeight="bold">{s.value}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>
    </Box>
  )
}
