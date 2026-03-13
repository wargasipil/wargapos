import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Box, Button, Card, Field, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { authClient } from '../client'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await authClient.login({ username, password })
      // Validate token to get userId and role
      const validate = await authClient.validateToken({ token: res.accessToken })
      login(res.accessToken, validate.userId, validate.role)
      navigate({ to: '/' })
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Card.Root width="400px" p={8}>
        <Card.Body>
          <VStack gap={6} as="form" onSubmit={handleSubmit}>
            <Heading size="lg">WargaPOS</Heading>
            <Field.Root required>
              <Field.Label>Username</Field.Label>
              <Input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Password</Field.Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field.Root>
            {error && <Text color="red.500" fontSize="sm">{error}</Text>}
            <Button type="submit" width="full" loading={loading}>
              Sign In
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
