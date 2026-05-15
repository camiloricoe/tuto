import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import NewProgramForm from './form'

export default async function NewProgramPage() {
  await requireSession()
  await requirePermission('academic:write')
  return <NewProgramForm />
}
