'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  removeFaviconAction,
  removeLogoAction,
  updateBrandingAction,
  uploadFaviconAction,
  uploadLogoAction,
} from '@/app/actions/branding'

// ─── Types ──────────────────────────────────────────────────────────────────

export type BrandingFormInitial = {
  logo_url: string | null
  favicon_url: string | null
  primary_hsl: string
  accent_hsl: string
  login_message: string
  email_from_name: string
  email_reply_to: string
  support_url: string
  support_email: string
}

const HSL_RE = /^\d{1,3} \d{1,3}% \d{1,3}%$/
const LOGIN_MESSAGE_MAX = 200
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const FAVICON_MAX_BYTES = 200 * 1024
const LOGO_ACCEPT = 'image/png,image/svg+xml,image/jpeg'
const FAVICON_ACCEPT =
  'image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml'

// ─── Color conversion (HSL string <-> hex) ──────────────────────────────────

function hslToHex(hsl: string): string {
  const m = hsl.trim().match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/)
  if (!m || !m[1] || !m[2] || !m[3]) return '#7c3aed'
  const h = Number(m[1]) / 360
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToHsl(hex: string): string {
  const m = hex.trim().match(/^#?([a-f\d]{6})$/i)
  if (!m || !m[1]) return ''
  const intVal = parseInt(m[1], 16)
  const r = ((intVal >> 16) & 255) / 255
  const g = ((intVal >> 8) & 255) / 255
  const b = (intVal & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ColorField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const valid = value === '' || HSL_RE.test(value)
  const hex = valid && value ? hslToHex(value) : '#7c3aed'

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={hex}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={valid ? '' : 'border-destructive'}
        />
      </div>
      {!valid && (
        <p className="text-xs text-destructive">
          Formato esperado: &quot;262 83% 58%&quot; (H S% L%)
        </p>
      )}
    </div>
  )
}

// ─── Main Form ──────────────────────────────────────────────────────────────

export function BrandingForm({ initial }: { initial: BrandingFormInitial }) {
  const [logoUrl, setLogoUrl] = useState(initial.logo_url)
  const [faviconUrl, setFaviconUrl] = useState(initial.favicon_url)
  const [primaryHsl, setPrimaryHsl] = useState(initial.primary_hsl)
  const [accentHsl, setAccentHsl] = useState(initial.accent_hsl)
  const [loginMessage, setLoginMessage] = useState(initial.login_message)
  const [emailFromName, setEmailFromName] = useState(initial.email_from_name)
  const [emailReplyTo, setEmailReplyTo] = useState(initial.email_reply_to)
  const [supportUrl, setSupportUrl] = useState(initial.support_url)
  const [supportEmail, setSupportEmail] = useState(initial.support_email)

  const [pending, startTransition] = useTransition()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const previewPrimary = useMemo(
    () => (HSL_RE.test(primaryHsl) ? primaryHsl : '262 83% 58%'),
    [primaryHsl],
  )
  const previewAccent = useMemo(
    () => (HSL_RE.test(accentHsl) ? accentHsl : '199 89% 48%'),
    [accentHsl],
  )

  const remainingChars = LOGIN_MESSAGE_MAX - loginMessage.length

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (primaryHsl && !HSL_RE.test(primaryHsl)) {
      toast.error('HSL primario invalido')
      return
    }
    if (accentHsl && !HSL_RE.test(accentHsl)) {
      toast.error('HSL de acento invalido')
      return
    }
    if (loginMessage.length > LOGIN_MESSAGE_MAX) {
      toast.error(`Mensaje de login excede ${LOGIN_MESSAGE_MAX} caracteres`)
      return
    }

    const fd = new FormData()
    fd.set('primary_hsl', primaryHsl)
    fd.set('accent_hsl', accentHsl)
    fd.set('login_message', loginMessage)
    fd.set('email_from_name', emailFromName)
    fd.set('email_reply_to', emailReplyTo)
    fd.set('support_url', supportUrl)
    fd.set('support_email', supportEmail)

    startTransition(async () => {
      const res = await updateBrandingAction(null, fd)
      if (res.success) {
        toast.success('Branding actualizado')
      } else {
        toast.error(res.error)
      }
    })
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('El logo no debe exceder 2MB')
      e.target.value = ''
      return
    }
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadLogoAction(fd)
      if (res.success) {
        if (res.publicUrl) setLogoUrl(res.publicUrl)
        toast.success('Logo actualizado')
      } else {
        toast.error(res.error)
      }
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > FAVICON_MAX_BYTES) {
      toast.error('El favicon no debe exceder 200KB')
      e.target.value = ''
      return
    }
    setUploadingFavicon(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadFaviconAction(fd)
      if (res.success) {
        if (res.publicUrl) setFaviconUrl(res.publicUrl)
        toast.success('Favicon actualizado')
      } else {
        toast.error(res.error)
      }
    } finally {
      setUploadingFavicon(false)
      if (faviconInputRef.current) faviconInputRef.current.value = ''
    }
  }

  async function handleLogoRemove() {
    setUploadingLogo(true)
    try {
      const res = await removeLogoAction()
      if (res.success) {
        setLogoUrl(null)
        toast.success('Logo eliminado')
      } else {
        toast.error(res.error)
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleFaviconRemove() {
    setUploadingFavicon(true)
    try {
      const res = await removeFaviconAction()
      if (res.success) {
        setFaviconUrl(null)
        toast.success('Favicon eliminado')
      } else {
        toast.error(res.error)
      }
    } finally {
      setUploadingFavicon(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ─── Form column ─── */}
      <div className="space-y-6">
        {/* Assets */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Logo y favicon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo (PNG, SVG o JPG, max 2MB)</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo actual"
                    className="h-12 w-12 rounded-md border border-border bg-background object-contain p-1"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    Sin logo
                  </div>
                )}
                <Input
                  ref={logoInputRef}
                  id="logo"
                  type="file"
                  accept={LOGO_ACCEPT}
                  disabled={uploadingLogo}
                  onChange={handleLogoChange}
                  className="cursor-pointer"
                />
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={handleLogoRemove}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon">Favicon (ICO, PNG o SVG, max 200KB)</Label>
              <div className="flex items-center gap-3">
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconUrl}
                    alt="Favicon actual"
                    className="h-8 w-8 rounded-md border border-border bg-background object-contain p-1"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
                    —
                  </div>
                )}
                <Input
                  ref={faviconInputRef}
                  id="favicon"
                  type="file"
                  accept={FAVICON_ACCEPT}
                  disabled={uploadingFavicon}
                  onChange={handleFaviconChange}
                  className="cursor-pointer"
                />
                {faviconUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingFavicon}
                    onClick={handleFaviconRemove}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Colores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="primary_hsl"
              label="Color primario (HSL)"
              value={primaryHsl}
              onChange={setPrimaryHsl}
              placeholder="262 83% 58%"
            />
            <ColorField
              id="accent_hsl"
              label="Color de acento (HSL)"
              value={accentHsl}
              onChange={setAccentHsl}
              placeholder="199 89% 48%"
            />
          </CardContent>
        </Card>

        {/* Login + Email */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Mensajes y correo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login_message">Mensaje en login</Label>
                <span
                  className={`text-xs ${
                    remainingChars < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {remainingChars} restantes
                </span>
              </div>
              <textarea
                id="login_message"
                name="login_message"
                value={loginMessage}
                maxLength={LOGIN_MESSAGE_MAX}
                onChange={(e) => setLoginMessage(e.target.value)}
                rows={3}
                placeholder="Bienvenido. Ingresa con tu correo institucional."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email_from_name">Nombre del remitente</Label>
                <Input
                  id="email_from_name"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  placeholder="Instituto Ejemplo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_reply_to">Email de respuesta</Label>
                <Input
                  id="email_reply_to"
                  type="email"
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  placeholder="contacto@ejemplo.edu"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Soporte</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support_url">URL de soporte</Label>
              <Input
                id="support_url"
                type="url"
                value={supportUrl}
                onChange={(e) => setSupportUrl(e.target.value)}
                placeholder="https://soporte.ejemplo.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_email">Email de soporte</Label>
              <Input
                id="support_email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="soporte@ejemplo.edu"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {/* ─── Preview column ─── */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base">Vista previa</CardTitle>
          </CardHeader>
          <CardContent
            className="space-y-4"
            style={
              {
                ['--preview-primary' as string]: `hsl(${previewPrimary})`,
                ['--preview-accent' as string]: `hsl(${previewAccent})`,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3 rounded-md border border-border bg-background/60 p-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-md object-contain"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--preview-primary)' }}
                >
                  T
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {emailFromName || 'Tu institución'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {supportEmail || 'soporte@ejemplo.edu'}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">Mensaje de login</p>
              <p className="mt-1 text-sm">
                {loginMessage || 'Bienvenido. Ingresa con tu correo institucional.'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                className="w-full rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--preview-primary)' }}
              >
                Botón primario
              </button>
              <button
                type="button"
                className="w-full rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--preview-accent)' }}
              >
                Botón de acento
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: 'var(--preview-primary)' }}
                />
                Primario
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: 'var(--preview-accent)' }}
                />
                Acento
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  )
}
