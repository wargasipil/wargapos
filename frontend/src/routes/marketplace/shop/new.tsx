import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Box, Button, Field, Heading, HStack, Input, NativeSelect, VStack,
} from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { MarketplaceShopType } from '../../../gen/wargapos/marketplace/v1/shop_pb'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'

export function ShopListingNewPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    type: MarketplaceShopType.SHOPEE,
    username: '',
    url: '',
  })

  const createMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.createShop({
        name: form.name,
        type: form.type,
        username: form.username,
        url: form.url,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-shops'] })
      toaster.create({ title: 'Shop created', type: 'success', duration: 2000 })
      navigate({ to: '/marketplace/shop' })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    createMutation.mutate()
  }

  return (
    <Box p={{ base: 3, md: 6 }} maxW="480px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/shop"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">New Shop</Heading>
      </HStack>

      <VStack gap={4} as="form" onSubmit={handleSubmit} align="stretch">
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Toko ABC"
          />
        </Field.Root>

        <Field.Root required>
          <Field.Label>Platform</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: Number(e.target.value) as MarketplaceShopType }))}
            >
              <option value={MarketplaceShopType.SHOPEE}>Shopee</option>
              <option value={MarketplaceShopType.TOKOPEDIA}>Tokopedia</option>
              <option value={MarketplaceShopType.LAZADA}>Lazada</option>
              <option value={MarketplaceShopType.OTHER}>Other</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Field.Root required>
          <Field.Label>Username</Field.Label>
          <Input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="@toko-abc"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>URL (optional)</Field.Label>
          <Input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://shopee.co.id/toko-abc"
          />
        </Field.Root>

        <HStack justify="flex-end" mt={2}>
          <Button asChild variant="ghost">
            <Link to="/marketplace/shop">Cancel</Link>
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            loading={createMutation.isPending}
            disabled={!form.name.trim() || !form.username.trim()}
          >
            Create Shop
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
