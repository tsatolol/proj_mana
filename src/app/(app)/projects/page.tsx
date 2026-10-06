import type { Metadata } from "next";

import { requireUser } from "@/lib/authz";

export const metadata: Metadata = { title: "プロジェクト" };

// Placeholder until the project list is implemented (roadmap step 4).
export default async function ProjectsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">プロジェクト</h1>
      <p className="text-muted-foreground">プロジェクト一覧は準備中です。</p>
    </div>
  );
}
