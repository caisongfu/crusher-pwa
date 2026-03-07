import {
  getCurrentUser,
  getCurrentProfile,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsPageClient } from "@/components/documents/documents-page-client";

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

  return <DocumentsPageClient />;
}
