import {
  getCurrentUser,
  getCurrentProfile,
  createClient,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsList } from "@/components/documents/documents-list";

export const metadata = {
  title: "我的文档 · Crusher",
};

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">我的文档</h1>
        <p className="text-sm text-zinc-500 mt-1">管理你所有的文档和分析结果</p>
      </div>

      <DocumentsList />
    </div>
  );
}
