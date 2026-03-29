import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect, Spinner, Switch, VStack,
} from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import { marketplaceClient } from '../../../client'
import { MarketplaceShopType } from '../../../gen/wargapos/marketplace/v1/shop_pb'
import { stripError } from '../../../lib/errors'
import { toaster } from '../../../components/ui/toaster'

export function ShopListingEditPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    type: MarketplaceShopType.SHOPEE,
    username: '',
    url: '',
    isActive: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-shop', id],
    queryFn: () => marketplaceClient.getShop({ id: BigInt(id) }),
    enabled: !!id,
  })

  useEffect(() => {
    const s = data?.shop
    if (!s) return
    setForm({
      name: s.name,
      type: s.type,
      username: s.username,
      url: s.url,
      isActive: s.isActive,
    })
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.updateShop({
        id: BigInt(id),
        name: form.name,
        type: form.type,
        username: form.username,
        url: form.url,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-shops'] })
      qc.invalidateQueries({ queryKey: ['marketplace-shop', id] })
      toaster.create({ title: 'Shop saved', type: 'success', duration: 2000 })
      navigate({ to: '/marketplace/shop' })
    },
    onError: (e) => toaster.create({ title: stripError(e), type: 'error', duration: 4000 }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    updateMutation.mutate()
  }

  if (isLoading) return <Flex justify="center" py={16}><Spinner /></Flex>

  return (
    <Box p={{ base: 3, md: 6 }} maxW="480px">
      <HStack gap={2} mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketplace/shop"><ArrowLeft size={16} /> Back</Link>
        </Button>
        <Heading size="md">Edit Shop</Heading>
      </HStack>

      <VStack gap={4} as="form" onSubmit={handleSubmit} align="stretch">
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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

        <Field.Root>
          <Flex justify="space-between" align="center">
            <Field.Label mb={0}>Active</Field.Label>
            <Switch.Root
              checked={form.isActive}
              onCheckedChange={(d) => setForm((f) => ({ ...f, isActive: d.checked }))}
            >
              <Switch.HiddenInput />
              <Switch.Control><Switch.Thumb /></Switch.Control>
            </Switch.Root>
          </Flex>
        </Field.Root>

        <HStack justify="flex-end" mt={2}>
          <Button asChild variant="ghost">
            <Link to="/marketplace/shop">Cancel</Link>
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            loading={updateMutation.isPending}
            disabled={!form.name.trim() || !form.username.trim()}
          >
            Save
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
