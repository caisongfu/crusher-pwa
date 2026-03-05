import { CaptureForm } from '@/components/documents/capture-form'

export const metadata = {
  title: '新建文档 · Crusher',
}

export default function CapturePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">新建文档</h1>
        <p className="text-sm text-zinc-500 mt-1">输入原始内容，AI 将为你深度分析</p>
      </div>
      <CaptureForm />
    </div>
  )
}