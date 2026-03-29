import { useRef } from 'react'
import {
  Badge, Box, Button, Flex, IconButton, Popover, Text, VStack,
} from '@chakra-ui/react'
import { Bell, Package } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { notificationClient } from '../../client'
import { useNotificationStore } from '../../store/notifications'
import type { Notification } from '../../gen/wargapos/notification/v1/notification_pb'
import { NotificationType } from '../../gen/wargapos/notification/v1/notification_pb'

function typeIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.ORDER_PLACED:    return '🆕'
    case NotificationType.ORDER_PREPARED:  return '✅'
    case NotificationType.ORDER_DELIVERED: return '🚚'
    case NotificationType.ORDER_PAID:      return '💰'
    case NotificationType.ORDER_CANCELLED: return '❌'
    default: return '🔔'
  }
}

function formatTime(n: Notification): string {
  const ts = n.createdAt
  if (!ts) return ''
  const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000)
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  unreadCount: number
}

export function NotificationPanel({ unreadCount }: Props) {
  const navigate = useNavigate()
  const { notifications, markAllRead } = useNotificationStore()
  const triggerRef = useRef<HTMLButtonElement>(null)

  async function handleMarkAllRead() {
    try {
      await notificationClient.markAllRead({})
      markAllRead()
    } catch { /* ignore */ }
  }

  function handleItemClick(orderId: bigint) {
    if (orderId) {
      navigate({ to: '/cafe/orders/$id', params: { id: String(orderId) } })
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Box position="relative" display="inline-flex">
          <IconButton ref={triggerRef} aria-label="Notifications" variant="ghost" size="sm">
            <Bell size={18} />
          </IconButton>
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorPalette="red"
              borderRadius="full"
              fontSize="9px"
              minW="16px"
              h="16px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              px={1}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </Popover.Trigger>

      <Popover.Positioner>
        <Popover.Content w="320px" maxW="95vw">
          <Popover.Body p={0}>
            <Flex align="center" justify="space-between" px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
              <Text fontWeight="semibold" fontSize="sm">Notifikasi</Text>
              {unreadCount > 0 && (
                <Button size="xs" variant="ghost" colorPalette="blue" onClick={handleMarkAllRead}>
                  Tandai Semua Dibaca
                </Button>
              )}
            </Flex>

            <VStack gap={0} maxH="360px" overflowY="auto" align="stretch">
              {notifications.length === 0 ? (
                <Flex direction="column" align="center" py={10} gap={2} color="gray.400">
                  <Package size={32} />
                  <Text fontSize="sm">Belum ada notifikasi</Text>
                </Flex>
              ) : (
                notifications.map((n, i) => (
                  <Box
                    key={i}
                    px={4}
                    py={3}
                    borderBottom="1px solid"
                    borderColor="gray.50"
                    bg={n.isRead ? 'white' : 'blue.50'}
                    cursor={n.orderId ? 'pointer' : 'default'}
                    _hover={{ bg: n.isRead ? 'gray.50' : 'blue.100' }}
                    onClick={() => n.orderId && handleItemClick(n.orderId)}
                  >
                    <Flex gap={2} align="flex-start">
                      <Text fontSize="lg" lineHeight="1.2">{typeIcon(n.type)}</Text>
                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight={n.isRead ? 'normal' : 'medium'} lineClamp={1}>
                          {n.title}
                        </Text>
                        {n.body && (
                          <Text fontSize="xs" color="gray.500" lineClamp={1}>{n.body}</Text>
                        )}
                      </Box>
                      <Text fontSize="10px" color="gray.400" flexShrink={0}>{formatTime(n)}</Text>
                    </Flex>
                  </Box>
                ))
              )}
            </VStack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}
