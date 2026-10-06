"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { inviteUser } from "../actions";

import { RoleSelect } from "./role-select";

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(inviteUser, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const emailError = state && !state.ok ? state.fieldErrors?.email?.[0] : undefined;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <Label htmlFor="invite-email">メールアドレス</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            aria-invalid={emailError ? true : undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">ロール</Label>
          <RoleSelect id="invite-role" name="role" defaultValue="MEMBER" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "招待中…" : "招待する"}
        </Button>
      </div>
      {emailError && <p className="text-sm text-destructive">{emailError}</p>}
      {state && !state.ok && !emailError && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && state.message && (
        <p className="text-sm text-muted-foreground" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
