import { DocumentsList } from '@/components/documents/documents-list'

export const metadata = {
  title: '我的文档 · Crusher',
}

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的文档</h1>
      </div>
      <DocumentsList />
    </div>
  )
}