import { notFound } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { DocumentDetail } from '@/components/documents/document-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    notFound()
  }

  const supabase = await createClient()
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .single()

  if (error || !document) {
    notFound()
  }

  return <DocumentDetail document={document} />
}