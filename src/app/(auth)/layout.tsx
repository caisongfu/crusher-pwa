import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.webp"
              alt="Crusher Logo"
              width={80}
              height={80}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold">Crusher · 碎石记</h1>
          <p className="text-sm text-zinc-500 mt-1">把碎片原石，碾成知识精矿</p>
        </div>
        {children}
      </div>
    </div>
  )
}
