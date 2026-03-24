import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect,
  Separator, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { KeyRound, CreditCard, User, MonitorSmartphone, Printer, HardDrive, Download, RotateCcw, Trash2 } from 'lucide-react'
import { ConnectError } from '@connectrpc/connect'
import { userClient, settingsClient, deviceClient, backupClient } from '../client'
import { useAuthStore } from '../store/auth'
import { toaster } from '../components/ui/toaster'
import { stripError } from '../lib/errors'
import { PrintMode } from '../gen/wargapos/settings/v1/settings_pb'

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
  { key: 'payment',  label: 'Payment',  Icon: CreditCard,       adminOnly: true },
  { key: 'printer',  label: 'Printer',  Icon: Printer,          adminOnly: true },
  { key: 'backup',   label: 'Backup',   Icon: HardDrive,        adminOnly: true },
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
          {isAdmin && section === 'backup'   && <BackupSection token={token} />}
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
  const [printMode, setPrintMode] = useState<PrintMode>(PrintMode.UNSPECIFIED)
  const [initialized, setInitialized] = useState(false)

  if (data && !initialized) {
    setTitle(data.printer?.title ?? '')
    setDescription(data.printer?.description ?? '')
    setAddress(data.printer?.address ?? '')
    setAddress2(data.printer?.address2 ?? '')
    setContact(data.printer?.contact ?? '')
    setFooter(data.printer?.footer ?? '')
    setPrintMode(data.printer?.printMode ?? PrintMode.UNSPECIFIED)
    setInitialized(true)
  }

  const mutation = useMutation({
    mutationFn: () =>
      settingsClient.updateSettings(
        {
          midtrans: data?.midtrans,
          manualPayment: data?.manualPayment,
          printer: { title, description, address, address2, contact, footer, printMode },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toaster.create({ title: 'Printer settings saved', type: 'success', duration: 3000 })
    },
  })

  if (isLoading) return <Box pt={4}><Spinner size="sm" /></Box>

  const isBrowser = printMode === PrintMode.BROWSER

  return (
    <Box pt={4}>
      <Text fontSize="xs" color="gray.500" mb={4}>
        Info usaha yang ditampilkan di header dan footer struk cetak.
      </Text>
      <VStack align="stretch" gap={3}>
        <Field.Root>
          <Field.Label>Mode Cetak</Field.Label>
          <HStack gap={0}>
            <Button
              size="sm"
              variant={!isBrowser ? 'solid' : 'outline'}
              colorPalette="blue"
              borderRightRadius={0}
              onClick={() => setPrintMode(PrintMode.CONNECTOR)}
            >
              Connector
            </Button>
            <Button
              size="sm"
              variant={isBrowser ? 'solid' : 'outline'}
              colorPalette="blue"
              borderLeftRadius={0}
              onClick={() => setPrintMode(PrintMode.BROWSER)}
            >
              Browser
            </Button>
          </HStack>
          <Field.HelperText>
            {isBrowser
              ? 'Cetak via print dialog browser — tidak perlu connector.'
              : 'Cetak ESC/POS via connector service (thermal printer).'}
          </Field.HelperText>
        </Field.Root>
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

// ── Backup ─────────────────────────────────────────────────────────────────────

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  return `${days} hari lalu`
}

function BackupSection({ token }: { token: string | null }) {
  const qc = useQueryClient()

  // Settings (schedule config + lastBackupAt)
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsClient.getSettings({}),
    staleTime: 30_000,
  })

  // Backup file list
  const { data: listData, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ['backup-list'],
    queryFn: () => backupClient.listBackup({}),
    staleTime: 15_000,
  })

  const [enabled, setEnabled]           = useState(false)
  const [intervalHours, setIntervalHours] = useState(24)
  const [retentionCount, setRetentionCount] = useState(7)
  const [backupDir, setBackupDir]       = useState('./backups')
  const [initialized, setInitialized]   = useState(false)

  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupLogs, setBackupLogs]   = useState<string[]>([])
  const abortRef  = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [backupLogs])
  useEffect(() => () => { abortRef.current?.abort() }, [])

  if (settingsData && !initialized) {
    setEnabled(settingsData.backup?.enabled ?? false)
    setIntervalHours(settingsData.backup?.intervalHours ?? 24)
    setRetentionCount(settingsData.backup?.retentionCount ?? 7)
    setBackupDir(settingsData.backup?.backupDir ?? './backups')
    setInitialized(true)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsClient.updateSettings(
        {
          midtrans: settingsData?.midtrans,
          manualPayment: settingsData?.manualPayment,
          printer: settingsData?.printer,
          backup: { enabled, intervalHours, retentionCount, backupDir },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toaster.create({ title: 'Backup settings saved', type: 'success', duration: 3000 })
    },
    onError: (e: unknown) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleRestoreByName(name: string) {
    setRestoring(name)
    try {
      const stream = backupClient.restoreBackup({ fname: name })
      for await (const _res of stream) { /* stream progress */ }
      toaster.create({ title: 'Restore berhasil', type: 'success', duration: 3000 })
    } catch (err) {
      toaster.create({ title: err instanceof ConnectError ? err.message : 'Restore failed', type: 'error', duration: 4000 })
    } finally {
      setRestoring(null)
    }
  }

  async function handleUploadRestore(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/backup/restore-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Restore failed' }))
        throw new Error(body.error ?? 'Restore failed')
      }
      toaster.create({ title: 'Restore berhasil', type: 'success', duration: 3000 })
    } catch (err) {
      toaster.create({ title: err instanceof Error ? err.message : 'Restore failed', type: 'error', duration: 4000 })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(name: string) {
    setDeleting(name)
    try {
      await backupClient.deleteBackup({ fname: name })
      toaster.create({ title: 'Backup dihapus', type: 'success', duration: 3000 })
      refetchList()
    } catch (err) {
      toaster.create({ title: err instanceof ConnectError ? err.message : 'Delete failed', type: 'error', duration: 4000 })
    } finally {
      setDeleting(null)
    }
  }

  const lastBackupAt = settingsData?.backup?.lastBackupAt
  const lastBackupDate = lastBackupAt
    ? new Date(Number(lastBackupAt.seconds) * 1000)
    : null

  if (settingsLoading) return <Box pt={4}><Spinner size="sm" /></Box>

  const files = listData?.fnames ?? []

  return (
    <Box pt={4}>
      {/* Backup Now */}
      <VStack align="stretch" gap={2} mb={5}>
        <Text fontWeight="semibold" fontSize="sm">Backup Database</Text>
        <Text fontSize="xs" color="gray.500">Backup dan restore database PostgreSQL.</Text>
        <HStack>
          <Button
            size="sm"
            colorPalette="blue"
            loading={isBackingUp}
            onClick={async () => {
              const ac = new AbortController()
              abortRef.current = ac
              setIsBackingUp(true)
              setBackupLogs([])
              try {
                const stream = backupClient.runBackup({}, { signal: ac.signal })
                for await (const res of stream) {
                  if (res.data.case === 'msg') {
                    setBackupLogs(prev => [...prev, res.data.value ?? ''])
                  } else if (res.data.case === 'filepath') {
                    setBackupLogs(prev => [...prev, '✓ Saved — download from the list below'])
                    refetchList()
                    qc.invalidateQueries({ queryKey: ['settings'] })
                  }
                }
              } catch (err) {
                if (!ac.signal.aborted) {
                  const msg = err instanceof ConnectError ? err.message : String(err)
                  setBackupLogs(prev => [...prev, `Error: ${msg}`])
                }
              } finally {
                setIsBackingUp(false)
              }
            }}
          >
            <HardDrive size={14} />
            Backup Now
          </Button>
          {lastBackupDate && (
            <Text fontSize="xs" color="gray.500">
              Last backup: {fmtRelative(lastBackupDate.toISOString())}
            </Text>
          )}
        </HStack>
        {backupLogs.length > 0 && (
          <Box fontSize="xs" color="gray.500" fontFamily="mono" mt={1}
               maxH="80px" overflowY="auto" bg="gray.50" p={2} borderRadius="md">
            {backupLogs.map((l, i) => <Text key={i}>{l}</Text>)}
            <div ref={logEndRef} />
          </Box>
        )}
      </VStack>

      <Separator mb={5} />

      {/* Schedule config */}
      <Text fontWeight="semibold" fontSize="sm" mb={3}>Backup Terjadwal</Text>
      <VStack align="stretch" gap={3}>
        <HStack>
          <input
            type="checkbox"
            id="backup-enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <label htmlFor="backup-enabled" style={{ fontSize: '14px', cursor: 'pointer' }}>
            Aktifkan backup otomatis
          </label>
        </HStack>
        <Field.Root>
          <Field.Label>Interval</Field.Label>
          <HStack gap={0}>
            {[
              { label: '6 Jam',    value: 6 },
              { label: 'Harian',   value: 24 },
              { label: 'Mingguan', value: 168 },
            ].map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={intervalHours === opt.value ? 'solid' : 'outline'}
                colorPalette="blue"
                borderRadius={0}
                _first={{ borderLeftRadius: 'md' }}
                _last={{ borderRightRadius: 'md' }}
                onClick={() => setIntervalHours(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </HStack>
        </Field.Root>
        <Field.Root>
          <Field.Label>Simpan N backup terakhir</Field.Label>
          <Input
            size="sm"
            type="number"
            w="80px"
            value={retentionCount}
            onChange={(e) => setRetentionCount(Number(e.target.value))}
            min={1}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Direktori backup (server)</Field.Label>
          <Input size="sm" value={backupDir} onChange={(e) => setBackupDir(e.target.value)} placeholder="./backups" />
        </Field.Root>
        <Flex justify="flex-end">
          <Button size="sm" colorPalette="blue" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Simpan
          </Button>
        </Flex>
      </VStack>

      <Separator my={5} />

      {/* Saved backups */}
      <Text fontWeight="semibold" fontSize="sm" mb={3}>Backup Tersimpan</Text>
      {listLoading ? (
        <Spinner size="sm" />
      ) : files.length === 0 ? (
        <Text fontSize="sm" color="gray.400">Belum ada backup tersimpan.</Text>
      ) : (
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <Table.Root size="sm">
            <Table.Body>
              {files.map((fname) => (
                <Table.Row key={fname}>
                  <Table.Cell>
                    <Text fontSize="xs" fontFamily="mono">{fname}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right" w="1px" whiteSpace="nowrap">
                    <HStack gap={1} justify="flex-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        title="Download"
                        onClick={() => window.open(`/backup/download-existing?file=${encodeURIComponent(fname)}&token=${encodeURIComponent(token ?? '')}`, '_blank')}
                      >
                        <Download size={13} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="blue"
                        title="Restore"
                        loading={restoring === fname}
                        onClick={() => handleRestoreByName(fname)}
                      >
                        <RotateCcw size={13} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        title="Delete"
                        loading={deleting === fname}
                        onClick={() => handleDelete(fname)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      <Separator my={5} />

      {/* Upload restore */}
      <Text fontWeight="semibold" fontSize="sm" mb={3}>Restore dari File</Text>
      <Text fontSize="xs" color="gray.500" mb={3}>Upload file .sql atau .sql.gz untuk restore database.</Text>
      <HStack>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sql,.sql.gz,.gz"
          style={{ fontSize: '13px' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUploadRestore(file)
          }}
        />
        {uploading && <Spinner size="sm" />}
      </HStack>

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
