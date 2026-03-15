import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { productClient, stockClient, uploadFile } from '../../client'
import { useAuthStore } from '../../store/auth'
import { toaster } from '../../components/ui/toaster'
import { stripError } from '../../lib/errors'

interface ProductForm {
  name: string
  description: string
  categoryId: string
  priceCents: string
  cogsCents: string
  sku: string
  imageUrl: string
}

const emptyForm: ProductForm = { name: '', description: '', categoryId: '', priceCents: '', cogsCents: '', sku: '', imageUrl: '' }


export function ProductNewPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token) ?? ''
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [initialStock, setInitialStock] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productClient.listCategories({}),
  })
  const categories = catData?.categories ?? []

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

  const createMutation = useMutation({
    mutationFn: () => productClient.createProduct({
      name: form.name,
      description: form.description,
      categoryId: form.categoryId ? BigInt(form.categoryId) : 0n,
      priceCents: BigInt(form.priceCents || '0'),
      cogsCents: BigInt(form.cogsCents || '0'),
      sku: form.sku,
      imageUrl: form.imageUrl,
    }),
    onSuccess: async (res) => {
      const qty = parseInt(initialStock || '0', 10)
      if (qty > 0 && res.product) {
        try {
          await stockClient.adjustStock(
            { productId: res.product.id, delta: qty, reason: 'restock', note: 'Initial stock' },
            { headers: { Authorization: `Bearer ${token}` } },
          )
        } catch { /* non-fatal */ }
      }
      qc.invalidateQueries({ queryKey: ['products'] })
      toaster.create({ title: 'Product created', type: 'success', duration: 3000 })
      navigate({ to: '/products' })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <Box p={{ base: 3, md: 6 }} maxW="560px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/products"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Add Product</Heading>
      </HStack>

      <VStack gap={4} as="form" onSubmit={handleSubmit} align="stretch">
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Product name"
            autoFocus
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
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
            placeholder="Stock keeping unit"
          />
        </Field.Root>

        <Field.Root required>
          <Field.Label>Price (IDR)</Field.Label>
          <Input
            type="number"
            value={form.priceCents}
            onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
            placeholder="0"
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
          <Field.Label>Initial Stock</Field.Label>
          <Input
            type="number"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            placeholder="0"
            min={0}
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

        <HStack justify="flex-end" mt={2}>
          <Button asChild variant="ghost">
            <Link to="/products">Cancel</Link>
          </Button>
          <Button type="submit" colorPalette="blue" loading={createMutation.isPending}>
            Create Product
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
