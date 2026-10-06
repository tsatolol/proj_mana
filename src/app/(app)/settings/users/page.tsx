import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvitationList } from "@/features/users/components/invitation-list";
import { InviteUserForm } from "@/features/users/components/invite-user-form";
import { UserList } from "@/features/users/components/user-list";
import { listPendingInvitations, listUsers } from "@/features/users/queries";
import { isAdmin, requireUser } from "@/lib/authz";

export const metadata: Metadata = { title: "ユーザー管理" };

export default async function UsersPage() {
  const currentUser = await requireUser();
  if (!isAdmin(currentUser)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">ユーザー管理</h1>
        <p className="text-muted-foreground">このページを表示する権限がありません。</p>
      </div>
    );
  }

  const [users, invitations] = await Promise.all([listUsers(), listPendingInvitations()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">ユーザー管理</h1>

      <Card>
        <CardHeader>
          <CardTitle>ユーザーを招待</CardTitle>
          <CardDescription>
            招待メールはまだ送信されません。招待後、ログイン URL を本人に共有してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>招待中</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationList invitations={invitations} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList users={users} currentUserId={currentUser.id} />
        </CardContent>
      </Card>
    </div>
  );
}
