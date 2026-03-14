import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Box, Button, Card, Field, Heading, HStack, IconButton, Input, InputGroup, Text, VStack } from '@chakra-ui/react'
import { Eye, EyeOff, ShoppingCart } from 'lucide-react'
import { authClient } from '../client'
import { useAuthStore } from '../store/auth'
import { stripError } from '../lib/errors'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      const validate = await authClient.validateToken({ token: res.accessToken })
      login(res.accessToken, String(validate.userId), validate.role)
      navigate({ to: '/' })
    } catch (err: unknown) {
      setError(stripError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50" px={4}>
      <Box width="full" maxW="400px">
        <VStack gap={2} mb={6}>
          <HStack gap={2}>
            <ShoppingCart size={28} color="#3b82f6" />
            <Heading size="xl" color="gray.800">WargaPOS</Heading>
          </HStack>
          <Text fontSize="sm" color="gray.500">Café Point of Sale</Text>
        </VStack>
      <Card.Root width="full">
        <Card.Body p={8}>
          <VStack gap={6} as="form" onSubmit={handleSubmit}>
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
              <InputGroup
                width="full"
                endElement={
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                }
              >
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </InputGroup>
            </Field.Root>
            {error && (
              <Alert.Root status="error" borderRadius="md" width="full">
                <Alert.Indicator />
                <Alert.Description fontSize="sm">{error}</Alert.Description>
              </Alert.Root>
            )}
            <Button type="submit" width="full" loading={loading}>
              Sign In
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
      </Box>
    </Box>
  )
}
