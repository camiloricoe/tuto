'use client'

import { useEffect, useTransition, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getUnreadCountAction,
  getNotificationsAction,
  markAsReadAction,
  markAllReadAction,
  type Notification,
} from '@/app/actions/notifications'

type NotificationBellProps = {
  initialUnreadCount: number
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Poll every 30 seconds for unread count
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getUnreadCountAction()
      setUnreadCount(count)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load notifications when dropdown opens
  useEffect(() => {
    if (!open) return
    getNotificationsAction().then(setNotifications)
  }, [open])

  function handleMarkAsRead(id: string) {
    startTransition(async () => {
      await markAsReadAction(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    })
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllReadAction()
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      setUnreadCount(0)
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} sin leer</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-1 px-3 py-2"
              onSelect={(e) => {
                e.preventDefault()
                if (!n.read_at) handleMarkAsRead(n.id)
                if (n.link) window.location.href = n.link
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={`text-sm font-medium leading-snug ${n.read_at ? 'text-muted-foreground' : ''}`}>
                  {n.title}
                </span>
                {!n.read_at && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                )}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
            </DropdownMenuItem>
          ))
        )}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-xs text-primary"
              onSelect={(e) => {
                e.preventDefault()
                handleMarkAllRead()
              }}
              disabled={isPending || unreadCount === 0}
            >
              Marcar todas como leidas
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
