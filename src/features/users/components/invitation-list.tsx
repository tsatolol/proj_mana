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
import { formatDate } from "@/lib/date";

import { revokeInvitation } from "../actions";
import type { PendingInvitation } from "../queries";
import { ROLE_LABELS } from "../schema";

export function InvitationList({ invitations }: { invitations: PendingInvitation[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">招待中のユーザーはいません。</p>;
  }

  const now = new Date();

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メールアドレス</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>有効期限</TableHead>
            <TableHead>招待者</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  {formatDate(invitation.expiresAt)}
                  {invitation.expiresAt <= now && <Badge variant="secondary">期限切れ</Badge>}
                </span>
              </TableCell>
              <TableCell>{invitation.invitedBy.name ?? invitation.invitedBy.email}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  aria-label={`${invitation.email} の招待を取り消す`}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await revokeInvitation({ invitationId: invitation.id });
                      setError(result.ok ? null : result.error);
                    })
                  }
                >
                  取り消す
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
