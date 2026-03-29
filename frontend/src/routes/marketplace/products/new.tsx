import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, Spinner, Text, Textarea, VStack,
} from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import { marketplaceClient, uploadFile } from '../../../client'
import { useAuthStore } from '../../../store/auth'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'

export function MarketplaceProductNewPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { token } = useAuthStore()

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
  })
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploading(true)
    try {
      const url = await uploadFile(file, token)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch {
      toaster.create({ title: 'Image upload failed', type: 'error', duration: 3000 })
    } finally {
      setUploading(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.createProduct({
        name: form.name,
        description: form.description,
        priceCents: BigInt(Math.round(parseFloat(form.price || '0') * 100)),
        imageUrl: form.imageUrl,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-products'] })
      toaster.create({ title: 'Product created', type: 'success', duration: 2000 })
      navigate({ to: '/marketplace/products' })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    createMutation.mutate()
  }

  return (
    <Box p={{ base: 3, md: 6 }} maxW="520px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/products"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">New Product</Heading>
      </HStack>

      <VStack gap={4} as="form" onSubmit={handleSubmit} align="stretch">
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Product name"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
            rows={3}
          />
        </Field.Root>

        <Field.Root required>
          <Field.Label>Price (IDR)</Field.Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Image</Field.Label>
          {form.imageUrl && (
            <Box mb={2} borderRadius="md" overflow="hidden" w="120px" h="120px" bg="gray.100">
              <img src={form.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          )}
          {uploading ? (
            <Flex align="center" gap={2}><Spinner size="sm" /><Text fontSize="sm">Uploading…</Text></Flex>
          ) : (
            <Input type="file" accept="image/*" onChange={handleFileChange} size="sm" />
          )}
        </Field.Root>

        <HStack justify="flex-end" mt={2}>
          <Button asChild variant="ghost">
            <Link to="/marketplace/products">Cancel</Link>
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            loading={createMutation.isPending}
            disabled={!form.name.trim() || uploading}
          >
            Create Product
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
