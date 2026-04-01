import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Badge, Box, Button, createListCollection, Dialog, Field, Flex, Heading, HStack, IconButton,
  Input, Select, Spinner, Table, Text, VStack,
} from '@chakra-ui/react'
import { Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { userClient } from '../../client'
import { useAuthStore } from '../../store/auth'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { Role } from '../../gen/wargapos/rolebased/v1/role_pb'

function roleToStr(role: Role): string {
  switch (role) {
    case Role.ROOT:             return 'root'
    case Role.ADMIN:            return 'admin'
    case Role.ACCOUNTANT:       return 'accountant'
    case Role.CASHIER:          return 'cashier'
    case Role.WAREHOUSE_ADMIN:  return 'warehouse_admin'
    case Role.WAREHOUSE_MEMBER: return 'warehouse_member'
    default:                    return 'cashier'
  }
}

function strToRole(s: string): Role {
  switch (s) {
    case 'root':             return Role.ROOT
    case 'admin':            return Role.ADMIN
    case 'accountant':       return Role.ACCOUNTANT
    case 'cashier':          return Role.CASHIER
    case 'warehouse_admin':  return Role.WAREHOUSE_ADMIN
    case 'warehouse_member': return Role.WAREHOUSE_MEMBER
    default:                 return Role.CASHIER
  }
}

const roleColor: Record<string, string> = {
  root: 'red',
  admin: 'purple',
  accountant: 'cyan',
  cashier: 'gray',
  warehouse_admin: 'orange',
  warehouse_member: 'yellow',
}

const roleLabel: Record<string, string> = {
  root: 'Root',
  admin: 'Admin',
  accountant: 'Accountant',
  cashier: 'Cashier',
  warehouse_admin: 'Warehouse Admin',
  warehouse_member: 'Warehouse Member',
}

interface AddForm {
  username: string
  fullName: string
  email: string
  password: string
  role: string
}

interface EditState {
  id: number
  fullName: string
  email: string
  role: string
  isActive: boolean
}

const emptyAdd: AddForm = { username: '', fullName: '', email: '', password: '', role: 'cashier' }

const roleCollection = createListCollection({
  items: [
    { label: 'Root',             value: 'root' },
    { label: 'Admin',            value: 'admin' },
    { label: 'Accountant',       value: 'accountant' },
    { label: 'Cashier',          value: 'cashier' },
    { label: 'Warehouse Admin',  value: 'warehouse_admin' },
    { label: 'Warehouse Member', value: 'warehouse_member' },
  ],
})

export function UsersPage() {
  const qc = useQueryClient()
  const { token, userId: myId } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }

  const [page, setPage] = useState(1)
  const pageSize = 20

  const [addOpen, setAddOpen] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => userClient.listUsers({ page, pageSize }, { headers }),
  })

  const createMutation = useMutation({
    mutationFn: () => userClient.createUser({
      username: addForm.username,
      fullName: addForm.fullName,
      email: addForm.email,
      password: addForm.password,
      role: strToRole(addForm.role),
    }, { headers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setAddOpen(false)
      setAddForm(emptyAdd)
      toaster.create({ title: 'User created', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const updateMutation = useMutation({
    mutationFn: () => userClient.updateUser({
      id: editState!.id,
      fullName: editState!.fullName,
      email: editState!.email,
      role: strToRole(editState!.role),
      isActive: editState!.isActive,
    }, { headers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditState(null)
      toaster.create({ title: 'User updated', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userClient.deleteUser({ id }, { headers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeletingId(null)
      toaster.create({ title: 'User deleted', type: 'success', duration: 3000 })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={2}><Users size={22} /><Heading size="md">Team</Heading></HStack>
        <Button colorPalette="blue" size="sm" width={{ base: 'full', md: 'auto' }} onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add User
        </Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt={12}><Spinner /></Flex>
      ) : (
        <>
          <Table.Root variant="outline" size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Username</Table.ColumnHeader>
                <Table.ColumnHeader>Role</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((u) => {
                const roleStr = roleToStr(u.role)
                return (
                  <Table.Row key={String(u.id)}>
                    <Table.Cell fontWeight="medium">{u.fullName || u.username}</Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500">{u.username}</Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={roleColor[roleStr]} size="sm">{roleLabel[roleStr] ?? roleStr}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={u.isActive ? 'green' : 'red'} size="sm" variant="subtle">
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={1} justify="flex-end">
                        <IconButton
                          aria-label="Edit"
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditState({
                            id: u.id,
                            fullName: u.fullName,
                            email: u.email,
                            role: roleStr,
                            isActive: u.isActive,
                          })}
                        >
                          <Pencil size={14} />
                        </IconButton>
                        {String(u.id) !== myId && (
                          <IconButton
                            aria-label="Delete"
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            onClick={() => setDeletingId(u.id)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
              {users.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No users found.</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>

          {total > pageSize && (
            <HStack justify="center" mt={4} gap={2}>
              <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Text fontSize="xs" color="gray.500">Page {page} of {Math.ceil(total / pageSize)}</Text>
              <Button size="xs" variant="outline" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </HStack>
          )}
        </>
      )}

      {/* Add User Dialog */}
      <Dialog.Root open={addOpen} onOpenChange={(e) => setAddOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Add User</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={3} as="form" id="add-user-form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); createMutation.mutate() }}>
                <Field.Root required>
                  <Field.Label>Username</Field.Label>
                  <Input value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} placeholder="johndoe" autoFocus />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Full Name</Field.Label>
                  <Input value={addForm.fullName} onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="John Doe" />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Email</Field.Label>
                  <Input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Password</Field.Label>
                  <Input type="password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Role</Field.Label>
                  <Select.Root
                    collection={roleCollection}
                    value={[addForm.role]}
                    onValueChange={(e) => setAddForm((f) => ({ ...f, role: e.value[0] ?? 'cashier' }))}
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger><Select.ValueText /></Select.Trigger>
                      <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {roleCollection.items.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" form="add-user-form" colorPalette="blue" loading={createMutation.isPending} disabled={!addForm.username || !addForm.password}>
                Create
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit User Dialog */}
      <Dialog.Root open={!!editState} onOpenChange={(e) => { if (!e.open) setEditState(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Edit User</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {editState && (
                <VStack gap={3} as="form" id="edit-user-form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); updateMutation.mutate() }}>
                  <Field.Root>
                    <Field.Label>Full Name</Field.Label>
                    <Input value={editState.fullName} onChange={(e) => setEditState((s) => s && ({ ...s, fullName: e.target.value }))} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Email</Field.Label>
                    <Input type="email" value={editState.email} onChange={(e) => setEditState((s) => s && ({ ...s, email: e.target.value }))} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Role</Field.Label>
                    <Select.Root
                      collection={roleCollection}
                      value={[editState.role]}
                      onValueChange={(e) => setEditState((s) => s && ({ ...s, role: e.value[0] ?? 'cashier' }))}
                    >
                      <Select.HiddenSelect />
                      <Select.Control>
                        <Select.Trigger><Select.ValueText /></Select.Trigger>
                        <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                      </Select.Control>
                      <Select.Positioner>
                        <Select.Content>
                          {roleCollection.items.map((item) => (
                            <Select.Item item={item} key={item.value}>
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Select.Root>
                  </Field.Root>
                  <Flex justify="space-between" align="center" w="full">
                    <Text fontSize="sm">Active</Text>
                    <input
                      type="checkbox"
                      checked={editState.isActive}
                      onChange={(e) => setEditState((s) => s && ({ ...s, isActive: e.target.checked }))}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </Flex>
                </VStack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setEditState(null)}>Cancel</Button>
              <Button type="submit" form="edit-user-form" colorPalette="blue" loading={updateMutation.isPending}>Save</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete Confirm Dialog */}
      <Dialog.Root open={deletingId !== null} onOpenChange={(e) => { if (!e.open) setDeletingId(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="360px">
            <Dialog.Header>
              <Dialog.Title>Delete User</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm">Are you sure you want to delete this user? This cannot be undone.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button
                colorPalette="red"
                loading={deleteMutation.isPending}
                onClick={() => deletingId !== null && deleteMutation.mutate(deletingId)}
              >
                Delete
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
