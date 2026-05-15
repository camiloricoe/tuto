import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod/v4'

const HEALTH_TOKEN = process.env.HEALTH_INGEST_TOKEN

const payloadSchema = z.object({
  source: z.enum(['cron', 'deploy', 'manual', 'pr', 'local']),
  trigger_actor: z.string().optional(),
  commit_sha: z.string().optional(),
  branch: z.string().optional(),
  environment: z.string().default('production'),
  unit_total: z.number().int().nonnegative().default(0),
  unit_passed: z.number().int().nonnegative().default(0),
  unit_failed: z.number().int().nonnegative().default(0),
  e2e_total: z.number().int().nonnegative().default(0),
  e2e_passed: z.number().int().nonnegative().default(0),
  e2e_failed: z.number().int().nonnegative().default(0),
  e2e_skipped: z.number().int().nonnegative().default(0),
  duration_ms: z.number().int().nonnegative().default(0),
  status: z.enum(['passed', 'failed', 'partial', 'running']),
  details: z.unknown().optional(),
})

export async function POST(req: NextRequest) {
  if (!HEALTH_TOKEN) {
    return NextResponse.json({ error: 'Health ingestion not configured' }, { status: 503 })
  }
  const token = req.headers.get('x-tuto-health-token')
  if (token !== HEALTH_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_test_runs')
    .insert({
      source: parsed.data.source,
      trigger_actor: parsed.data.trigger_actor ?? null,
      commit_sha: parsed.data.commit_sha ?? null,
      branch: parsed.data.branch ?? null,
      environment: parsed.data.environment,
      unit_total: parsed.data.unit_total,
      unit_passed: parsed.data.unit_passed,
      unit_failed: parsed.data.unit_failed,
      e2e_total: parsed.data.e2e_total,
      e2e_passed: parsed.data.e2e_passed,
      e2e_failed: parsed.data.e2e_failed,
      e2e_skipped: parsed.data.e2e_skipped,
      duration_ms: parsed.data.duration_ms,
      status: parsed.data.status,
      details: (parsed.data.details ?? null) as never,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
