"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-result";

import { changeUserRole, setUserActive } from "../actions";
import type { UserListItem } from "../queries";

import { RoleSelect } from "./role-select";

type Props = { users: UserListItem[]; currentUserId: string };

export function UserList({ users, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const label = user.name ?? user.email;
            return (
              <TableRow key={user.id} data-testid={`user-row-${user.email}`}>
                <TableCell>
                  {label}
                  {isSelf && <span className="ml-2 text-xs text-muted-foreground">（自分）</span>}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <RoleSelect
                    value={user.role}
                    disabled={isSelf || pending}
                    aria-label={`${label} のロール`}
                    onValueChange={(role) => run(() => changeUserRole({ userId: user.id, role }))}
                  />
                </TableCell>
                <TableCell>
                  {user.isActive ? (
                    <Badge variant="outline">有効</Badge>
                  ) : (
                    <Badge variant="secondary">無効</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!isSelf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => setUserActive({ userId: user.id, isActive: !user.isActive }))
                      }
                    >
                      {user.isActive ? "無効化" : "有効化"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
