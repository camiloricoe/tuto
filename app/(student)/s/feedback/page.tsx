import { MyFeedbackList } from '@/components/shared/my-feedback'

export default function StudentFeedbackPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis tickets</h1>
      <MyFeedbackList />
    </div>
  )
}
