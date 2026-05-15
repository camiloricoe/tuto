'use client'

import { useEffect, useState } from 'react'

type Variant = 'datetime' | 'date' | 'time' | 'relative'

type FormattedTimeProps = {
  value: string | Date
  variant?: Variant
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Hace ${days}d`
  return date.toLocaleDateString('es')
}

export function FormattedTime({ value, variant = 'datetime' }: FormattedTimeProps) {
  const date = typeof value === 'string' ? new Date(value) : value
  const iso = date.toISOString()
  const [text, setText] = useState<string>(() => {
    if (variant === 'date') return date.toISOString().slice(0, 10)
    if (variant === 'time') return date.toISOString().slice(11, 19)
    if (variant === 'relative') return ''
    return iso.replace('T', ' ').slice(0, 19) + ' UTC'
  })

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (variant === 'date') {
      setText(new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: tz }).format(date))
    } else if (variant === 'time') {
      setText(new Intl.DateTimeFormat('es', { timeStyle: 'medium', timeZone: tz }).format(date))
    } else if (variant === 'relative') {
      setText(formatRelative(date))
    } else {
      setText(
        new Intl.DateTimeFormat('es', {
          dateStyle: 'short',
          timeStyle: 'medium',
          timeZone: tz,
        }).format(date),
      )
    }
  }, [iso, variant, date])

  return (
    <time dateTime={iso} title={`${iso} (UTC)`}>
      {text}
    </time>
  )
}
