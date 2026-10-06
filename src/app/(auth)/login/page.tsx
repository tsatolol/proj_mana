import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn } from "@/lib/auth";
import { getCurrentUser } from "@/lib/authz";

export const metadata: Metadata = { title: "ログイン" };

// Error codes Auth.js appends as ?error=... when redirecting to the sign-in page.
function errorMessage(error: string | string[] | undefined): string | null {
  if (!error) return null;
  if (error === "AccessDenied") {
    return "このアカウントではログインできません。管理者に招待を依頼してください。";
  }
  return "ログインに失敗しました。時間をおいて再度お試しください。";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/projects");

  const message = errorMessage((await searchParams).error);

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/projects" });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">proj_mana</CardTitle>
          <CardDescription>チームのためのプロジェクト管理ツール</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {message && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full">
              Google でログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
