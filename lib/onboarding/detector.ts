import { createAdminClient } from '@/lib/supabase/admin'
import { MILESTONES } from './catalog'
import type { Milestone, RoleCode } from './types'

export type DetectorContext = {
  userId: string
  tenantId: string | null
  isSuperAdmin: boolean
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>

const HEAD = { count: 'exact' as const, head: true }

export async function detectAll(
  ctx: DetectorContext,
  role: RoleCode,
): Promise<Map<string, boolean>> {
  const admin = createAdminClient()
  const milestones = MILESTONES.filter((m) => m.role === role)
  const results = await Promise.all(
    milestones.map(async (m) => {
      try {
        const completed = await detectOne(admin, ctx, m)
        return [m.code, completed] as const
      } catch {
        return [m.code, false] as const
      }
    }),
  )
  return new Map(results)
}

async function detectOne(
  admin: SupabaseAdmin,
  ctx: DetectorContext,
  m: Milestone,
): Promise<boolean> {
  const tid = ctx.tenantId

  switch (m.code) {
    // ─── super_admin (global) ───
    case 'superadmin.first_real_tenant': {
      const { data } = await admin
        .from('tenants')
        .select('id, slug')
        .eq('active', true)
      const real = (data ?? []).filter((t) => {
        const slug = (t.slug ?? '').toLowerCase()
        return (
          slug !== 'indecap' &&
          !slug.startsWith('e2e-') &&
          !slug.startsWith('test-')
        )
      })
      return real.length >= 1
    }
    case 'superadmin.users_invited': {
      const { count } = await admin.from('user_profiles').select('id', HEAD)
      return (count ?? 0) >= 2
    }
    case 'superadmin.custom_domain': {
      const { count } = await admin
        .from('tenants')
        .select('id', HEAD)
        .not('custom_domain', 'is', null)
      return (count ?? 0) >= 1
    }
    case 'superadmin.audit_active': {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const { count } = await admin
        .from('activity_log')
        .select('id', HEAD)
        .gte('occurred_at', since)
      return (count ?? 0) >= 10
    }
    case 'superadmin.platform_health': {
      const { count } = await admin.from('platform_test_runs').select('id', HEAD)
      return (count ?? 0) >= 1
    }

    // ─── admin (per-tenant) ───
    case 'admin.branding_customized': {
      if (!tid) return false
      const { data } = await admin
        .from('tenant_branding')
        .select('logo_url, primary_hsl')
        .eq('tenant_id', tid)
        .maybeSingle()
      return Boolean(data?.logo_url) || Boolean(data?.primary_hsl)
    }
    case 'admin.first_period': {
      if (!tid) return false
      const { count } = await admin
        .from('academic_periods')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'admin.first_program': {
      if (!tid) return false
      const { count } = await admin
        .from('academic_programs')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'admin.first_course': {
      if (!tid) return false
      const { count } = await admin
        .from('courses')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'admin.invite_teacher':
      return tid ? hasUserWithRole(admin, tid, 'teacher') : false
    case 'admin.invite_student':
      return tid ? hasUserWithRole(admin, tid, 'student') : false
    case 'admin.first_payment_concept': {
      if (!tid) return false
      const { count } = await admin
        .from('payment_concepts')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'admin.subdomain_configured': {
      if (!tid) return false
      const { data } = await admin
        .from('tenants')
        .select('subdomain')
        .eq('id', tid)
        .maybeSingle()
      return Boolean(data?.subdomain)
    }

    // ─── coordinator ───
    case 'coordinator.has_program': {
      if (!tid) return false
      const { count } = await admin
        .from('academic_programs')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'coordinator.first_subject': {
      if (!tid) return false
      const { count } = await admin
        .from('subjects')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'coordinator.first_teacher_assigned': {
      if (!tid) return false
      const { count } = await admin
        .from('courses')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .not('teacher_id', 'is', null)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'coordinator.first_enrollment': {
      if (!tid) return false
      const { count } = await admin
        .from('enrollments')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'coordinator.first_grade_published': {
      if (!tid) return false
      const { count } = await admin
        .from('grades')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .not('published_at', 'is', null)
      return (count ?? 0) >= 1
    }

    // ─── treasurer ───
    case 'treasurer.has_concepts': {
      if (!tid) return false
      const { count } = await admin
        .from('payment_concepts')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'treasurer.first_charge': {
      if (!tid) return false
      const { count } = await admin
        .from('student_charges')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'treasurer.first_payment': {
      if (!tid) return false
      const { count } = await admin
        .from('payments')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'treasurer.first_receipt': {
      if (!tid) return false
      const { count } = await admin
        .from('receipts')
        .select('id', HEAD)
        .eq('tenant_id', tid)
      return (count ?? 0) >= 1
    }
    case 'treasurer.voided_flow_known': {
      if (!tid) return false
      const { count } = await admin
        .from('payments')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .eq('status', 'voided')
      return (count ?? 0) >= 1
    }

    // ─── teacher (per-user) ───
    case 'teacher.has_courses':
      return tid ? hasOwnCourses(admin, tid, ctx.userId) : false
    case 'teacher.has_students': {
      if (!tid) return false
      const courseIds = await getOwnCourseIds(admin, tid, ctx.userId)
      if (courseIds.length === 0) return false
      const { count } = await admin
        .from('enrollments')
        .select('id', HEAD)
        .in('course_id', courseIds)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'teacher.first_grade': {
      if (!tid) return false
      const enrollIds = await getOwnEnrollmentIds(admin, tid, ctx.userId)
      if (enrollIds.length === 0) return false
      const { count } = await admin
        .from('grades')
        .select('id', HEAD)
        .in('enrollment_id', enrollIds)
      return (count ?? 0) >= 1
    }
    case 'teacher.first_grade_published': {
      if (!tid) return false
      const enrollIds = await getOwnEnrollmentIds(admin, tid, ctx.userId)
      if (enrollIds.length === 0) return false
      const { count } = await admin
        .from('grades')
        .select('id', HEAD)
        .in('enrollment_id', enrollIds)
        .not('published_at', 'is', null)
      return (count ?? 0) >= 1
    }

    // ─── student (per-user) ───
    case 'student.enrolled': {
      if (!tid) return false
      const { count } = await admin
        .from('enrollments')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .eq('student_id', ctx.userId)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'student.has_grades': {
      if (!tid) return false
      const { data: enrolls } = await admin
        .from('enrollments')
        .select('id')
        .eq('tenant_id', tid)
        .eq('student_id', ctx.userId)
        .is('deleted_at', null)
      const ids = (enrolls ?? []).map((e) => e.id)
      if (ids.length === 0) return false
      const { count } = await admin
        .from('grades')
        .select('id', HEAD)
        .in('enrollment_id', ids)
      return (count ?? 0) >= 1
    }
    case 'student.has_charges': {
      if (!tid) return false
      const { count } = await admin
        .from('student_charges')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .eq('student_id', ctx.userId)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'student.has_payment': {
      if (!tid) return false
      const { count } = await admin
        .from('payments')
        .select('id', HEAD)
        .eq('tenant_id', tid)
        .eq('student_id', ctx.userId)
        .is('deleted_at', null)
      return (count ?? 0) >= 1
    }
    case 'student.profile_complete': {
      const { data } = await admin
        .from('user_profiles')
        .select('avatar_url, full_name')
        .eq('id', ctx.userId)
        .maybeSingle()
      const hasAvatar = Boolean(data?.avatar_url)
      const hasFullName =
        Boolean(data?.full_name) &&
        (data?.full_name ?? '').trim().split(/\s+/).length >= 2
      return hasAvatar && hasFullName
    }

    default:
      return false
  }
}

async function hasUserWithRole(
  admin: SupabaseAdmin,
  tenantId: string,
  roleCode: string,
): Promise<boolean> {
  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', roleCode)
    .maybeSingle()
  if (!role?.id) return false
  const { count } = await admin
    .from('user_roles')
    .select('id', HEAD)
    .eq('tenant_id', tenantId)
    .eq('role_id', role.id)
    .is('revoked_at', null)
  return (count ?? 0) >= 1
}

async function hasOwnCourses(
  admin: SupabaseAdmin,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const { count } = await admin
    .from('courses')
    .select('id', HEAD)
    .eq('tenant_id', tenantId)
    .eq('teacher_id', userId)
    .is('deleted_at', null)
  return (count ?? 0) >= 1
}

async function getOwnCourseIds(
  admin: SupabaseAdmin,
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const { data } = await admin
    .from('courses')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('teacher_id', userId)
    .is('deleted_at', null)
  return (data ?? []).map((c) => c.id)
}

async function getOwnEnrollmentIds(
  admin: SupabaseAdmin,
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const courseIds = await getOwnCourseIds(admin, tenantId, userId)
  if (courseIds.length === 0) return []
  const { data } = await admin
    .from('enrollments')
    .select('id')
    .in('course_id', courseIds)
    .is('deleted_at', null)
  return (data ?? []).map((e) => e.id)
}
