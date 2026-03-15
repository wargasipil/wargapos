import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect, Spinner, Switch, Text, VStack,
} from '@chakra-ui/react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { productClient, uploadFile } from '../../client'
import { useAuthStore } from '../../store/auth'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'
import { formatPrice } from '../../lib/format'

interface ProductForm {
  name: string
  description: string
  categoryId: string
  priceCents: string
  cogsCents: string
  sku: string
  imageUrl: string
  isActive: boolean
}

export function ProductEditPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { id } = useParams({ strict: false }) as { id: string }
  const token = useAuthStore((s) => s.token) ?? ''
  const [form, setForm] = useState<ProductForm>({
    name: '', description: '', categoryId: '', priceCents: '', cogsCents: '', sku: '', imageUrl: '', isActive: true,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productClient.getProduct({ id: BigInt(id) }),
    enabled: !!id,
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })
  const categories = catData?.categories ?? []

  useEffect(() => {
    const p = productData?.product
    if (!p) return
    setForm({
      name: p.name,
      description: p.description,
      categoryId: p.categoryId ? String(p.categoryId) : '',
      priceCents: String(p.priceCents),
      cogsCents: p.cogsCents > 0n ? String(p.cogsCents) : '',
      sku: p.sku,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
    })
  }, [productData])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadFile(file, token)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch {
      setUploadError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const updateMutation = useMutation({
    mutationFn: () => productClient.updateProduct({
      id: BigInt(id),
      name: form.name,
      description: form.description,
      categoryId: form.categoryId ? BigInt(form.categoryId) : 0n,
      priceCents: BigInt(form.priceCents || '0'),
      cogsCents: BigInt(form.cogsCents || '0'),
      sku: form.sku,
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      toaster.create({ title: 'Product saved', type: 'success', duration: 3000 })
      navigate({ to: '/products/$id', params: { id } })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate()
  }

  if (isLoading) {
    return <Flex justify="center" mt={12}><Spinner /></Flex>
  }

  return (
    <Box p={{ base: 3, md: 6 }} maxW="560px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/products/$id" params={{ id }}><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Edit Product</Heading>
      </HStack>

      <VStack gap={4} as="form" onSubmit={handleSubmit} align="stretch">
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Category</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>SKU</Field.Label>
          <Input
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </Field.Root>

        <Field.Root required>
          <Field.Label>Price (IDR)</Field.Label>
          <Input
            type="number"
            value={form.priceCents}
            onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Cost Price / COGS (IDR)</Field.Label>
          <Input
            type="number"
            value={form.cogsCents}
            onChange={(e) => setForm({ ...form, cogsCents: e.target.value })}
            placeholder="0"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Image</Field.Label>
          <Flex gap={3} align="center">
            {form.imageUrl && (
              <img src={form.imageUrl} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
            )}
            <Input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} p={1} />
          </Flex>
          {uploading && <Text fontSize="xs" color="gray.500">Uploading…</Text>}
          {uploadError && <Text fontSize="xs" color="red.500">{uploadError}</Text>}
        </Field.Root>

        <Field.Root>
          <Flex align="center" gap={3}>
            <Field.Label mb={0}>Active</Field.Label>
            <Switch.Root
              checked={form.isActive}
              onCheckedChange={(d) => setForm({ ...form, isActive: d.checked })}
            >
              <Switch.HiddenInput />
              <Switch.Control><Switch.Thumb /></Switch.Control>
            </Switch.Root>
          </Flex>
        </Field.Root>

        <HStack justify="flex-end" mt={2}>
          <Button asChild variant="ghost">
            <Link to="/products/$id" params={{ id }}>Cancel</Link>
          </Button>
          <Button type="submit" colorPalette="blue" loading={updateMutation.isPending}>
            Save
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
