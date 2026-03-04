import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="text-6xl">🪨</div>
        <h1 className="text-4xl font-bold">Crusher · 碎石记</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          把碎片原石，碾成知识精矿
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">登录</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">注册</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
