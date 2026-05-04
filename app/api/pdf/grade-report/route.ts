import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { GradeReportPDF, type GradeReportData } from '@/lib/pdf/grade-report'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    await requirePermission('grades:read')

    if (!session.activeTenantId) {
      return NextResponse.json({ error: 'No hay tenant activo' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const periodId = searchParams.get('periodId')

    if (!studentId || !periodId) {
      return NextResponse.json({ error: 'studentId y periodId son requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()
    const tenantId = session.activeTenantId

    // Fetch all needed data in parallel
    const [studentRes, periodRes, tenantRes, enrollmentsRes] = await Promise.all([
      admin
        .from('user_profiles')
        .select('full_name, document_number')
        .eq('id', studentId)
        .single(),
      admin
        .from('academic_periods')
        .select('name, program_id, academic_programs(name)')
        .eq('id', periodId)
        .eq('tenant_id', tenantId)
        .single(),
      admin.from('tenants').select('name').eq('id', tenantId).single(),
      admin
        .from('enrollments')
        .select(
          `
          id, final_grade, final_letter, status,
          courses!inner(
            id, subject_id, period_id,
            subjects(name, code),
            grading_schemes(passing_grade, uses_letters),
            course_evaluations(id, name, weight, sequence)
          )
        `,
        )
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .eq('courses.period_id', periodId)
        .is('deleted_at', null),
    ])

    if (!studentRes.data) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }
    if (!periodRes.data) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })
    }
    if (!tenantRes.data) {
      return NextResponse.json({ error: 'Institucion no encontrada' }, { status: 404 })
    }

    const enrollments = enrollmentsRes.data ?? []

    // Fetch grades for all enrollments
    const enrollmentIds = enrollments.map((e) => e.id)
    const gradesRes =
      enrollmentIds.length > 0
        ? await admin
            .from('grades')
            .select('enrollment_id, evaluation_id, value')
            .in('enrollment_id', enrollmentIds)
            .eq('status', 'published')
        : { data: [] }

    const gradesData = gradesRes.data ?? []

    const period = periodRes.data
    const programName =
      (period.academic_programs as unknown as { name: string } | null)?.name ?? 'Programa'

    const courses: GradeReportData['courses'] = enrollments.map((enrollment) => {
      const course = enrollment.courses as unknown as {
        id: string
        subject_id: string
        subjects: { name: string; code: string } | null
        grading_schemes: { passing_grade: number; uses_letters: boolean } | null
        course_evaluations: Array<{ id: string; name: string; weight: number; sequence: number }>
      }

      const subject = course.subjects
      const scheme = course.grading_schemes
      const evaluations = (course.course_evaluations ?? []).sort(
        (a, b) => a.sequence - b.sequence,
      )

      const enrollmentGrades = gradesData.filter((g) => g.enrollment_id === enrollment.id)

      const evalWithValues = evaluations.map((ev) => {
        const grade = enrollmentGrades.find((g) => g.evaluation_id === ev.id)
        return {
          name: ev.name,
          weight: ev.weight,
          value: grade?.value ?? 0,
        }
      })

      const finalGrade = enrollment.final_grade ?? 0
      const passingGrade = scheme?.passing_grade ?? 60

      return {
        subjectName: subject?.name ?? 'Materia',
        subjectCode: subject?.code ?? '',
        evaluations: evalWithValues,
        finalGrade,
        finalLetter: enrollment.final_letter,
        passed: finalGrade >= passingGrade,
      }
    })

    const data: GradeReportData = {
      studentName: studentRes.data.full_name,
      documentNumber: studentRes.data.document_number,
      institutionName: tenantRes.data.name,
      programName,
      periodName: period.name,
      courses,
      generatedAt: new Date().toLocaleString('es', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
    }

    const buffer = await renderToBuffer(GradeReportPDF({ data }))

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="boletin-${studentId}-${periodId}.pdf"`,
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
