import { Button } from "@/components/ui/button";

// Placeholder top page until authentication and the project list are implemented.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">proj_mana</h1>
      <p className="text-muted-foreground">チームのためのプロジェクト管理ツール</p>
      <Button disabled>ログイン（準備中）</Button>
    </main>
  );
}
