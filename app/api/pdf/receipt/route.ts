import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReceiptPDF, type ReceiptData } from '@/lib/pdf/receipt'
import { resolveBrandingForPdf } from '@/lib/pdf/branding'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    await requirePermission('payments:read')

    if (!session.activeTenantId) {
      return NextResponse.json({ error: 'No hay tenant activo' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId es requerido' }, { status: 400 })
    }

    const admin = createAdminClient()
    const tenantId = session.activeTenantId

    const [paymentRes, tenantRes] = await Promise.all([
      admin
        .from('payments')
        .select(
          'id, amount, currency, method, paid_on, reference, recorded_at, student_id',
        )
        .eq('id', paymentId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single(),
      admin.from('tenants').select('name').eq('id', tenantId).single(),
    ])

    if (!paymentRes.data) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }
    if (!tenantRes.data) {
      return NextResponse.json({ error: 'Institucion no encontrada' }, { status: 404 })
    }

    const payment = paymentRes.data
    const { data: student } = await admin
      .from('user_profiles')
      .select('full_name, document_number')
      .eq('id', payment.student_id)
      .single()

    // Fetch allocations with concept names
    const { data: allocations } = await admin
      .from('payment_allocations')
      .select(
        `
        amount_applied,
        student_charges!charge_id(
          payment_concepts!concept_id(name)
        )
      `,
      )
      .eq('payment_id', paymentId)

    const allocationItems = (allocations ?? []).map((alloc) => {
      const charge = alloc.student_charges as unknown as {
        payment_concepts: { name: string } | null
      } | null
      return {
        conceptName: charge?.payment_concepts?.name ?? 'Concepto',
        amount: alloc.amount_applied,
      }
    })

    // Resolve tenant branding (logo bytes, colors, support contacts).
    // Never throws — falls back to TUTO defaults if anything is missing.
    const branding = await resolveBrandingForPdf(tenantId, tenantRes.data.name)

    const data: ReceiptData = {
      receiptNumber: payment.id.slice(0, 8).toUpperCase(),
      institutionName: branding.tenantName,
      studentName: student?.full_name ?? 'Estudiante',
      documentNumber: student?.document_number ?? null,
      paymentDate: payment.paid_on,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      reference: payment.reference,
      allocations: allocationItems,
      issuedAt: new Date().toLocaleString('es', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
      branding,
    }

    const buffer = await renderToBuffer(ReceiptPDF({ data }))

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recibo-${payment.id.slice(0, 8)}.pdf"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    if (message === 'Unauthorized' || message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (message === 'Forbidden' || message.includes('Permiso')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
