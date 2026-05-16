'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Copy, Globe, Loader2, ShieldCheck, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  removeCustomDomainAction,
  setCustomDomainAction,
  verifyCustomDomainAction,
} from '@/app/actions/custom-domain'

// ─── Types ────────────────────────────────────────────────────────────────

type DomainsFormProps = {
  tenantId: string
  tenantName: string
  subdomain: string
  initialCustomDomain: string | null
}

// ─── CopySnippet — inline code block + copy button ────────────────────────

function CopySnippet({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">
        {value}
      </code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleCopy}
        aria-label={ariaLabel}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────

export function DomainsForm({
  tenantId,
  tenantName,
  subdomain,
  initialCustomDomain,
}: DomainsFormProps) {
  const router = useRouter()
  const [currentDomain, setCurrentDomain] = useState<string | null>(initialCustomDomain)
  const [input, setInput] = useState('')
  const [verifyTarget, setVerifyTarget] = useState('')
  const [pendingSave, startSave] = useTransition()
  const [pendingRemove, startRemove] = useTransition()
  const [pendingVerify, startVerify] = useTransition()
  const [verifyResult, setVerifyResult] = useState<
    null | { ok: boolean; message: string }
  >(null)

  const subdomainUrl = `https://${subdomain}.creadigitalagency.com`

  const dnsName = '@'
  const cnameValue = 'cname.vercel-dns.com'

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim()) {
      toast.error('Ingresa un dominio')
      return
    }
    startSave(async () => {
      const res = await setCustomDomainAction(tenantId, input)
      if (res.success) {
        toast.success(`Dominio asignado a ${tenantName}`)
        setCurrentDomain(res.domain)
        setInput('')
        setVerifyResult(null)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleRemove() {
    if (!currentDomain) return
    const ok = window.confirm(
      `¿Quitar el dominio "${currentDomain}" de ${tenantName}? Los usuarios deberan volver a usar el subdominio.`,
    )
    if (!ok) return
    startRemove(async () => {
      const res = await removeCustomDomainAction(tenantId)
      if (res.success) {
        toast.success('Dominio eliminado')
        setCurrentDomain(null)
        setVerifyResult(null)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleVerify() {
    const target = (verifyTarget || currentDomain || '').trim()
    if (!target) {
      toast.error('No hay dominio para verificar')
      return
    }
    setVerifyResult(null)
    startVerify(async () => {
      const res = await verifyCustomDomainAction(target)
      setVerifyResult(res)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })
  }

  return (
    <div className="space-y-6">
      {/* ─── Current URLs ─── */}
      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">URLs actuales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Subdominio (siempre disponible)
            </Label>
            <CopySnippet value={subdomainUrl} ariaLabel="Copiar URL de subdominio" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Dominio personalizado
            </Label>
            {currentDomain ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                  https://{currentDomain}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={pendingRemove}
                  aria-label="Quitar dominio"
                  className="text-destructive hover:text-destructive"
                >
                  {pendingRemove ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Quitar
                </Button>
              </div>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Sin dominio personalizado configurado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Set / change form ─── */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {currentDomain ? 'Cambiar dominio' : 'Configurar dominio'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-domain">Dominio personalizado</Label>
              <Input
                id="custom-domain"
                name="custom-domain"
                type="text"
                placeholder="portal.miinstituto.edu.co"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras, numeros y guiones. No incluyas http:// ni rutas.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pendingSave}>
                {pendingSave ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Guardar dominio
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── DNS instructions ─── */}
      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Instrucciones DNS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <p className="text-muted-foreground">
            Para que el dominio funcione, sigue estos pasos en tu proveedor de DNS
            (Cloudflare, GoDaddy, Namecheap, etc.) y en el panel de Vercel.
          </p>

          <ol className="space-y-5">
            <li className="space-y-2">
              <p className="font-medium">
                1. Añade un registro <span className="font-mono">CNAME</span> en tu DNS
              </p>
              <p className="text-xs text-muted-foreground">
                Usa <code className="font-mono">@</code> si es el dominio raiz, o el
                subdominio (ej: <code className="font-mono">portal</code>).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Nombre
                  </Label>
                  <CopySnippet value={dnsName} ariaLabel="Copiar nombre DNS" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Valor
                  </Label>
                  <CopySnippet value={cnameValue} ariaLabel="Copiar valor CNAME" />
                </div>
              </div>
            </li>

            <li className="space-y-2">
              <p className="font-medium">
                2. Agrega el dominio en Vercel
              </p>
              <p className="text-xs text-muted-foreground">
                Abre el panel del proyecto TUTO en Vercel → Settings → Domains, y
                pega el dominio que configuraste arriba. Vercel emite el certificado
                SSL automaticamente.
              </p>
            </li>

            <li className="space-y-2">
              <p className="font-medium">
                3. Espera 1–5 minutos
              </p>
              <p className="text-xs text-muted-foreground">
                La propagacion DNS y la emision del certificado SSL son rapidas, pero
                pueden tardar hasta unos minutos.
              </p>
            </li>

            <li className="space-y-2">
              <p className="font-medium">
                4. Verifica el dominio
              </p>
              <p className="text-xs text-muted-foreground">
                Cuando termines, haz click abajo para confirmar que el dominio apunta
                a TUTO.
              </p>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* ─── Verify ─── */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Verificar dominio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="verify-domain">Dominio a verificar</Label>
            <Input
              id="verify-domain"
              name="verify-domain"
              type="text"
              placeholder={currentDomain ?? 'portal.miinstituto.edu.co'}
              value={verifyTarget}
              onChange={(e) => setVerifyTarget(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Por defecto, verifica el dominio asignado a este tenant.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleVerify}
              disabled={pendingVerify}
            >
              {pendingVerify ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Verificar dominio
                </>
              )}
            </Button>
          </div>

          {verifyResult && (
            <div
              role="status"
              className={
                'rounded-md border px-3 py-2 text-sm ' +
                (verifyResult.ok
                  ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                  : 'border-destructive/40 bg-destructive/10 text-destructive')
              }
            >
              {verifyResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
