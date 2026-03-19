import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect,
  Separator, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { KeyRound, CreditCard, User, MonitorSmartphone, Printer } from 'lucide-react'
import { userClient, settingsClient, deviceClient } from '../client'
import { useAuthStore } from '../store/auth'
import { toaster } from '../components/ui/toaster'
import { stripError } from '../lib/errors'

// ── Nav definition ─────────────────────────────────────────────────────────────

interface NavItem {
  key: string
  label: string
  Icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'profile',  label: 'Profile',  Icon: User },
  { key: 'password', label: 'Password', Icon: KeyRound },
  { key: 'payment',  label: 'Payment',  Icon: CreditCard, adminOnly: true },
  { key: 'printer',  label: 'Printer',  Icon: Printer,    adminOnly: true },
  { key: 'devices',  label: 'Devices',  Icon: MonitorSmartphone },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { token, role, userId } = useAuthStore()
  const isAdmin = role === 'admin'
  const [section, setSection] = useState('profile')

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <Box p={{ base: 4, md: 8 }} maxW="680px">
      <Heading size={{ base: 'md', md: 'lg' }} mb={6}>Settings</Heading>

      {/* Mobile: dropdown */}
      <Box display={{ base: 'block', md: 'none' }} mb={4}>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field value={section} onChange={(e) => setSection(e.target.value)}>
            {visibleItems.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>

      {/* Desktop: side nav + content */}
      <Flex gap={6} align="flex-start">
        <VStack display={{ base: 'none', md: 'flex' }} align="stretch" gap={1} w="160px" flexShrink={0}>
          {visibleItems.map((item) => (
            <HStack
              key={item.key}
              px={3}
              py={2}
              borderRadius="md"
              cursor="pointer"
              bg={section === item.key ? 'blue.50' : 'transparent'}
              color={section === item.key ? 'blue.600' : 'gray.600'}
              fontWeight={section === item.key ? 'medium' : 'normal'}
              _hover={{ bg: section === item.key ? 'blue.50' : 'gray.100' }}
              onClick={() => setSection(item.key)}
            >
              <item.Icon size={14} />
              <Text fontSize="sm">{item.label}</Text>
            </HStack>
          ))}
        </VStack>

        <Box flex={1} minW={0}>
          {section === 'profile'  && <ProfileSection userId={userId} role={role} />}
          {section === 'password' && <ChangePasswordSection token={token} />}
          {isAdmin && section === 'payment'  && <PaymentSection token={token} />}
          {isAdmin && section === 'printer'  && <PrinterSection token={token} />}
          {section === 'devices'  && <DevicesSection />}
        </Box>
      </Flex>
    </Box>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────────

function ProfileSection({ userId, role }: { userId: string | null; role: string | null }) {
  const qc = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [initialized, setInitialized] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userClient.getUser({ id: BigInt(userId!) }),
    enabled: !!userId,
  })

  if (data && !initialized) {
    setFullName(data.user?.fullName ?? '')
    setEmail(data.user?.email ?? '')
    setInitialized(true)
  }

  const mutation = useMutation({
    mutationFn: () =>
      userClient.updateUser({
        id: BigInt(userId!),
        fullName,
        email,
        role: data?.user?.role,
        isActive: data?.user?.isActive ?? true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] })
      toaster.create({ title: 'Profile updated', type: 'success', duration: 3000 })
    },
  })

  if (isLoading) return <Box pt={4}><Spinner size="sm" /></Box>

  return (
    <Box pt={4}>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Full Name</Field.Label>
          <Input size="sm" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field.Root>
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input size="sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field.Root>
        <Field.Root>
          <Field.Label>Role</Field.Label>
          <Input size="sm" value={role ?? ''} readOnly opacity={0.6} />
        </Field.Root>
        {mutation.isError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{stripError(mutation.error)}</Alert.Description>
          </Alert.Root>
        )}
        <Flex justify="flex-end" pt={1}>
          <Button size="sm" colorPalette="blue" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save Profile
          </Button>
        </Flex>
      </VStack>
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
          <Input type="password" size="sm" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
        </Field.Root>
        <Field.Root>
          <Field.Label>New Password</Field.Label>
          <Input type="password" size="sm" value={next} onChange={(e) => setNext(e.target.value)} placeholder="••••••••" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Confirm New Password</Field.Label>
          <Input type="password" size="sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
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
          <Button size="sm" colorPalette="blue" loading={mutation.isPending} onClick={handleSubmit}>
            Update Password
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

// ── Payment (Midtrans + Manual) ────────────────────────────────────────────────

function PaymentSection({ token }: { token: string | null }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsClient.getSettings({}),
  })

  // Midtrans state
  const [serverKey, setServerKey] = useState('')
  const [clientKey, setClientKey] = useState('')
  const [environment, setEnvironment] = useState('sandbox')

  // Manual payment state
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [qrisImageUrl, setQrisImageUrl] = useState('')

  const [initialized, setInitialized] = useState(false)

  if (data && !initialized) {
    setServerKey(data.midtrans?.serverKey ?? '')
    setClientKey(data.midtrans?.clientKey ?? '')
    setEnvironment(data.midtrans?.environment ?? 'sandbox')
    setBankName(data.manualPayment?.bankName ?? '')
    setBankAccountNumber(data.manualPayment?.bankAccountNumber ?? '')
    setBankAccountName(data.manualPayment?.bankAccountName ?? '')
    setQrisImageUrl(data.manualPayment?.qrisImageUrl ?? '')
    setInitialized(true)
  }

  const env = environment !== 'production' ? 'sandbox' : 'production'

  const midtransMutation = useMutation({
    mutationFn: () =>
      settingsClient.updateSettings(
        { midtrans: { serverKey, clientKey, environment: env }, manualPayment: data?.manualPayment, printer: data?.printer },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toaster.create({ title: 'Midtrans settings saved', type: 'success', duration: 3000 })
    },
  })

  const manualMutation = useMutation({
    mutationFn: () =>
      settingsClient.updateSettings(
        {
          midtrans: data?.midtrans,
          manualPayment: { bankName, bankAccountNumber, bankAccountName, qrisImageUrl },
          printer: data?.printer,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toaster.create({ title: 'Pengaturan pembayaran manual disimpan', type: 'success', duration: 3000 })
    },
  })

  if (isLoading) return <Box pt={4}><Spinner size="sm" /></Box>

  return (
    <Box pt={4}>
      {/* Midtrans */}
      <Text fontWeight="semibold" fontSize="sm" mb={3}>Midtrans</Text>
      <Text fontSize="xs" color="gray.500" mb={3}>Midtrans payment gateway keys.</Text>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Server Key</Field.Label>
          <Input size="sm" value={serverKey} onChange={(e) => setServerKey(e.target.value)} placeholder="SB-Mid-server-..." />
        </Field.Root>
        <Field.Root>
          <Field.Label>Client Key</Field.Label>
          <Input size="sm" value={clientKey} onChange={(e) => setClientKey(e.target.value)} placeholder="SB-Mid-client-..." />
        </Field.Root>
        <Field.Root>
          <Field.Label>Environment</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field value={environment} onChange={(e) => setEnvironment(e.target.value)}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        {midtransMutation.isError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{stripError(midtransMutation.error)}</Alert.Description>
          </Alert.Root>
        )}
        <Flex justify="flex-end" pt={1}>
          <Button size="sm" colorPalette="blue" loading={midtransMutation.isPending} onClick={() => midtransMutation.mutate()}>
            Save Midtrans
          </Button>
        </Flex>
      </VStack>

      <Separator my={6} />

      {/* Manual Payment */}
      <Text fontWeight="semibold" fontSize="sm" mb={3}>Pembayaran Manual</Text>
      <Text fontSize="xs" color="gray.500" mb={3}>
        Informasi rekening dan QRIS untuk pembayaran manual.
      </Text>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Nama Bank</Field.Label>
          <Input size="sm" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Nomor Rekening</Field.Label>
          <Input size="sm" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="1234567890" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Atas Nama</Field.Label>
          <Input size="sm" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Nama Pemilik" />
        </Field.Root>
        <Field.Root>
          <Field.Label>URL Gambar QRIS</Field.Label>
          <Input size="sm" value={qrisImageUrl} onChange={(e) => setQrisImageUrl(e.target.value)} placeholder="https://..." />
          {qrisImageUrl && (
            <Box mt={2} borderRadius="md" overflow="hidden" w="160px" borderWidth="1px">
              <img src={qrisImageUrl} alt="QRIS Preview" style={{ width: '100%' }} />
            </Box>
          )}
        </Field.Root>
        {manualMutation.isError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{stripError(manualMutation.error)}</Alert.Description>
          </Alert.Root>
        )}
        <Flex justify="flex-end" pt={1}>
          <Button size="sm" colorPalette="blue" loading={manualMutation.isPending} onClick={() => manualMutation.mutate()}>
            Simpan
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

// ── Printer Settings ───────────────────────────────────────────────────────────

function PrinterSection({ token }: { token: string | null }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsClient.getSettings({}),
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [address2, setAddress2] = useState('')
  const [contact, setContact] = useState('')
  const [footer, setFooter] = useState('')
  const [initialized, setInitialized] = useState(false)

  if (data && !initialized) {
    setTitle(data.printer?.title ?? '')
    setDescription(data.printer?.description ?? '')
    setAddress(data.printer?.address ?? '')
    setAddress2(data.printer?.address2 ?? '')
    setContact(data.printer?.contact ?? '')
    setFooter(data.printer?.footer ?? '')
    setInitialized(true)
  }

  const mutation = useMutation({
    mutationFn: () =>
      settingsClient.updateSettings(
        {
          midtrans: data?.midtrans,
          manualPayment: data?.manualPayment,
          printer: { title, description, address, address2, contact, footer },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toaster.create({ title: 'Printer settings saved', type: 'success', duration: 3000 })
    },
  })

  if (isLoading) return <Box pt={4}><Spinner size="sm" /></Box>

  return (
    <Box pt={4}>
      <Text fontSize="xs" color="gray.500" mb={4}>
        Info usaha yang ditampilkan di header dan footer struk cetak.
      </Text>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Nama Usaha</Field.Label>
          <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="WargaPOS" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Deskripsi</Field.Label>
          <Input size="sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Café & Resto" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Alamat</Field.Label>
          <Input size="sm" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Merdeka No.1" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Alamat 2</Field.Label>
          <Input size="sm" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Jakarta 10110" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Kontak</Field.Label>
          <Input size="sm" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="0812-3456-7890" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Pesan Struk</Field.Label>
          <Input size="sm" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Terima kasih telah berkunjung!" />
        </Field.Root>
        {mutation.isError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description fontSize="sm">{stripError(mutation.error)}</Alert.Description>
          </Alert.Root>
        )}
        <Flex justify="flex-end" pt={1}>
          <Button size="sm" colorPalette="blue" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

// ── Devices ────────────────────────────────────────────────────────────────────

function DevicesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceClient.listDevices({}),
    refetchInterval: 5000,
  })

  if (isLoading) return <Box pt={4}><Spinner size="sm" /></Box>

  const devices = data?.devices ?? []

  return (
    <Box pt={4}>
      <Text fontSize="xs" color="gray.500" mb={4}>
        Connector devices currently connected to the server.
      </Text>
      {devices.length === 0 ? (
        <Text fontSize="sm" color="gray.400">No devices connected.</Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {devices.map((d) => (
            <Box key={d.id} px={3} py={2} borderRadius="md" borderWidth="1px" borderColor="border.subtle">
              <HStack mb={d.printerNames.length > 0 ? 1 : 0}>
                <MonitorSmartphone size={16} />
                <Text fontSize="sm" fontWeight="medium">{d.name}</Text>
                <Text fontSize="xs" color="gray.500" ml="auto">{d.id}</Text>
              </HStack>
              {d.printerNames.length > 0 && (
                <VStack align="start" gap={0.5} pl={6}>
                  {d.printerNames.map((p) => (
                    <HStack key={p} gap={1}>
                      <Printer size={11} color="gray" />
                      <Text fontSize="xs" color="gray.500">{p}</Text>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  )
}
