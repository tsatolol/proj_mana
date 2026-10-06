import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { isAdmin, requireUser } from "@/lib/authz";

// Shell for all signed-in pages. Pages and actions still check authorization
// themselves; this layout check only keeps signed-out users away from the UI.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/projects" className="font-semibold">
            proj_mana
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">
              プロジェクト
            </Link>
            {isAdmin(user) && (
              <Link href="/settings/users" className="text-muted-foreground hover:text-foreground">
                ユーザー管理
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span data-testid="current-user">{user.name ?? user.email}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
