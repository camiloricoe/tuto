'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Cambiar tema" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme('light')} className="gap-2">
          <Sun className="h-4 w-4" /> Claro
          {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('dark')} className="gap-2">
          <Moon className="h-4 w-4" /> Oscuro
          {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('system')} className="gap-2">
          <Monitor className="h-4 w-4" /> Sistema
          {theme === 'system' && <span className="ml-auto text-xs text-muted-foreground">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
