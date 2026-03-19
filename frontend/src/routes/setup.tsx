import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Box, Button, Field, Flex, Heading, Input, Text, VStack,
} from '@chakra-ui/react'
import { ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { stripError } from '../lib/errors'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

export function SetupPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      const res = await fetch('/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data: { token: string } = await res.json()
      const claims = decodeJwtPayload(data.token)
      const userId  = String(claims.user_id ?? claims.sub ?? '')
      const role    = String(claims.role ?? 'admin')
      const exp     = Number(claims.exp ?? 0) * 1000
      login(data.token, '', exp, userId, role)
      navigate({ to: '/' })
    } catch (e) {
      setError(stripError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box bg="white" p={8} borderRadius="xl" boxShadow="md" w="full" maxW="400px">
        <VStack gap={6} align="stretch">
          <VStack gap={2}>
            <Flex align="center" gap={2}>
              <ShoppingCart size={24} color="#3b82f6" />
              <Heading size="lg">WargaPOS</Heading>
            </Flex>
            <Text color="gray.500" fontSize="sm" textAlign="center">
              Welcome! Create your admin account to get started.
            </Text>
          </VStack>

          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label>Username</Field.Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Password</Field.Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Confirm Password</Field.Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                />
              </Field.Root>

              {error && (
                <Text color="red.500" fontSize="sm">{error}</Text>
              )}

              <Button
                type="submit"
                colorPalette="blue"
                loading={loading}
                width="full"
                mt={2}
              >
                Create Account &amp; Open App
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Flex>
  )
}
