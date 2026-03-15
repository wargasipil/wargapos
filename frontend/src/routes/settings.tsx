import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect,
  Spinner, Tabs, Text, VStack,
} from '@chakra-ui/react'
import { KeyRound, CreditCard } from 'lucide-react'
import { userClient, settingsClient } from '../client'
import { useAuthStore } from '../store/auth'
import { toaster } from '../components/ui/toaster'
import { stripError } from '../lib/errors'

export function SettingsPage() {
  const { token, role } = useAuthStore()
  const isAdmin = role === 'admin'

  return (
    <Box p={{ base: 4, md: 8 }} maxW="480px">
      <Heading size={{ base: 'md', md: 'lg' }} mb={6}>Settings</Heading>
      <Tabs.Root defaultValue="password" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="password">
            <HStack gap={1.5}>
              <KeyRound size={14} />
              Change Password
            </HStack>
          </Tabs.Trigger>
          {isAdmin && (
            <Tabs.Trigger value="midtrans">
              <HStack gap={1.5}>
                <CreditCard size={14} />
                Midtrans
              </HStack>
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content value="password">
          <ChangePasswordSection token={token} />
        </Tabs.Content>
        {isAdmin && (
          <Tabs.Content value="midtrans">
            <MidtransSection token={token} />
          </Tabs.Content>
        )}
      </Tabs.Root>
    </Box>
  )
}

// ── Change Password ────────────────────────────────────────────────────────────

function ChangePasswordSection({ token }: { token: string | null }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      userClient.changePassword(
        { currentPassword: current, newPassword: next },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      toaster.create({ title: 'Password changed', type: 'success', duration: 3000 })
      setCurrent('')
      setNext('')
      setConfirm('')
      setValidationError(null)
    },
  })

  function handleSubmit() {
    setValidationError(null)
    if (!current || !next || !confirm) {
      setValidationError('All fields are required.')
      return
    }
    if (next !== confirm) {
      setValidationError('New password and confirmation do not match.')
      return
    }
    mutation.mutate()
  }

  return (
    <Box pt={4}>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Current Password</Field.Label>
          <Input
            type="password"
            size="sm"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>New Password</Field.Label>
          <Input
            type="password"
            size="sm"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="••••••••"
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Confirm New Password</Field.Label>
          <Input
            type="password"
            size="sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field.Root>
        {(validationError || mutation.isError) && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description fontSize="sm">
              {validationError ?? stripError(mutation.error)}
            </Alert.Description>
          </Alert.Root>
        )}
        <Flex justify="flex-end" pt={1}>
          <Button
            size="sm"
            colorPalette="blue"
            loading={mutation.isPending}
            onClick={handleSubmit}
          >
            Update Password
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

// ── Midtrans Configuration ─────────────────────────────────────────────────────

function MidtransSection({ token }: { token: string | null }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsClient.getSettings({}),
  })

  const [serverKey, setServerKey] = useState('')
  const [clientKey, setClientKey] = useState('')
  const [environment, setEnvironment] = useState('sandbox')
  const [initialized, setInitialized] = useState(false)

  if (data && !initialized) {
    setServerKey(data.midtrans?.serverKey ?? '')
    setClientKey(data.midtrans?.clientKey ?? '')
    setEnvironment(data.midtrans?.environment ?? 'sandbox')
    setInitialized(true)
  }

  const mutation = useMutation({
    mutationFn: () =>
      settingsClient.updateSettings(
        { midtrans: { serverKey, clientKey, environment } },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toaster.create({ title: 'Midtrans settings saved', type: 'success', duration: 3000 })
    },
  })

  if (isLoading) return (
    <Box pt={4}>
      <Spinner size="sm" />
    </Box>
  )

  return (
    <Box pt={4}>
      <Text fontSize="xs" color="gray.500" mb={4}>Payment gateway keys used for online payments.</Text>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Server Key</Field.Label>
          <Input
            size="sm"
            value={serverKey}
            onChange={(e) => setServerKey(e.target.value)}
            placeholder="SB-Mid-server-..."
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Client Key</Field.Label>
          <Input
            size="sm"
            value={clientKey}
            onChange={(e) => setClientKey(e.target.value)}
            placeholder="SB-Mid-client-..."
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Environment</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        {mutation.isError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{stripError(mutation.error)}</Alert.Description>
          </Alert.Root>
        )}
        <Flex justify="flex-end" pt={1}>
          <Button
            size="sm"
            colorPalette="blue"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save Settings
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}
