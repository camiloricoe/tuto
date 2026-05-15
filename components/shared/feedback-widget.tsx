'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MessageSquarePlus, X, Crosshair, Bug, Lightbulb, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFeedbackAction } from '@/app/actions/feedback'
import type { FeedbackType } from '@/lib/validators/feedback'

type Captured = {
  selector: string
  text: string
  rect: { x: number; y: number; w: number; h: number }
}

function buildSelector(el: Element): string {
  if (el instanceof HTMLElement && el.id) return `#${el.id}`
  const parts: string[] = []
  let node: Element | null = el
  let depth = 0
  while (node && depth < 4 && node.tagName.toLowerCase() !== 'body') {
    let part = node.tagName.toLowerCase()
    if (node instanceof HTMLElement && node.dataset.testid) {
      parts.unshift(`${part}[data-testid="${node.dataset.testid}"]`)
      break
    }
    if (node.classList.length > 0) {
      const cls = Array.from(node.classList)
        .filter((c) => !c.includes(':') && !c.startsWith('hover'))
        .slice(0, 2)
        .join('.')
      if (cls) part += `.${cls}`
    }
    parts.unshift(part)
    node = node.parentElement
    depth++
  }
  return parts.join(' > ')
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [captured, setCaptured] = useState<Captured | null>(null)
  const [type, setType] = useState<FeedbackType>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const overlayRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!picking) return

    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;pointer-events:none;border:2px solid oklch(0.69 0.18 262);background:oklch(0.69 0.18 262 / 0.15);z-index:99998;transition:all 0.05s;border-radius:4px'
    document.body.appendChild(overlay)
    overlayRef.current = overlay
    document.body.style.cursor = 'crosshair'

    const onMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target || target === overlay) return
      if (target.closest('[data-feedback-ignore]')) return
      const rect = target.getBoundingClientRect()
      overlay.style.top = `${rect.top}px`
      overlay.style.left = `${rect.left}px`
      overlay.style.width = `${rect.width}px`
      overlay.style.height = `${rect.height}px`
    }

    const onClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target || target === overlay) return
      // Don't intercept clicks on the widget's own UI (button, banner, etc.)
      if (target.closest('[data-feedback-ignore]')) return
      e.preventDefault()
      e.stopPropagation()
      const rect = target.getBoundingClientRect()
      setCaptured({
        selector: buildSelector(target),
        text: (target.textContent ?? '').slice(0, 200).trim(),
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      })
      setPicking(false)
      setOpen(true)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicking(false)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey)
      document.body.style.cursor = ''
      overlay.remove()
      overlayRef.current = null
    }
  }, [picking])

  function reset() {
    setOpen(false)
    setCaptured(null)
    setTitle('')
    setDescription('')
    setError(null)
    setSuccess(false)
    setType('bug')
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createFeedbackAction({
        type,
        title,
        description,
        targetUrl: window.location.href,
        targetSelector: captured?.selector,
        targetText: captured?.text,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        userAgent: navigator.userAgent,
      })
      if ('error' in res && res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div data-feedback-ignore>
      {!open && !picking && (
        <Button
          onClick={() => setPicking(true)}
          className="fixed bottom-6 right-6 z-50 h-12 gap-2 rounded-full shadow-lg"
          size="lg"
        >
          <MessageSquarePlus className="h-5 w-5" />
          Feedback
        </Button>
      )}

      {picking && (
        <div className="fixed top-6 left-1/2 z-[99999] -translate-x-1/2 flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
          <Crosshair className="h-4 w-4" />
          <span>Click en el elemento sobre el que quieres reportar (ESC cancela)</span>
          <button
            type="button"
            onClick={() => {
              setPicking(false)
              setOpen(true)
            }}
            className="ml-2 rounded-full bg-primary-foreground/20 px-3 py-0.5 text-xs hover:bg-primary-foreground/30"
          >
            Saltar
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="glass w-full max-w-md rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {success ? 'Gracias!' : 'Reportar feedback'}
              </h2>
              <Button variant="ghost" size="icon" onClick={reset} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {success ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tu reporte fue registrado. Puedes verlo en tu seccion de tickets.
                </p>
                <Button onClick={reset} className="w-full">Cerrar</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { val: 'bug', label: 'Bug', icon: Bug },
                      { val: 'suggestion', label: 'Sugerencia', icon: Lightbulb },
                      { val: 'question', label: 'Pregunta', icon: HelpCircle },
                    ] as const
                  ).map(({ val, label, icon: Icon }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setType(val)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors ${type === val ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fb-title">Titulo</Label>
                  <Input
                    id="fb-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Resumen breve"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fb-desc">Descripcion</Label>
                  <textarea
                    id="fb-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Que pasa, que esperabas, pasos para reproducir..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Elemento seleccionado</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        setPicking(true)
                      }}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Crosshair className="h-3 w-3" />
                      {captured ? 'Cambiar' : 'Seleccionar'}
                    </button>
                  </div>
                  {captured ? (
                    <>
                      <p className="font-mono text-[10px] text-muted-foreground break-all">
                        {captured.selector}
                      </p>
                      {captured.text && (
                        <p className="text-muted-foreground line-clamp-2">"{captured.text}"</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Sin elemento. El reporte usara la URL actual.
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button onClick={submit} disabled={isPending || !title || !description} className="w-full">
                  {isPending ? 'Enviando...' : 'Enviar reporte'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
