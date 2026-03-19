import { create } from 'zustand'
import type { Notification } from '../gen/wargapos/notification/v1/notification_pb'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Notification) => void
  markAllRead: () => void
  setAll: (ns: Notification[]) => void
}

const MAX = 100

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((state) => {
      const notifications = [n, ...state.notifications].slice(0, MAX)
      const unreadCount = state.unreadCount + (n.isRead ? 0 : 1)
      return { notifications, unreadCount }
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true }) as Notification),
      unreadCount: 0,
    })),

  setAll: (ns) =>
    set({
      notifications: ns.slice(0, MAX),
      unreadCount: ns.filter((n) => !n.isRead).length,
    }),
}))
