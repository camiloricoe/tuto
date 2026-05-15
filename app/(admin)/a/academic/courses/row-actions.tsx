'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { deleteCourseAction } from '@/app/actions/academic/courses'

export function CourseRowActions({ courseId, canWrite }: { courseId: string; canWrite: boolean }) {
  if (!canWrite) return null
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" className="gap-1">
        <Link href={`/a/academic/courses/${courseId}/edit`}>
          <Pencil className="h-4 w-4" /> Editar
        </Link>
      </Button>
      <DeleteButton action={async () => deleteCourseAction(courseId)} />
    </div>
  )
}
