"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ROLE_LABELS, roleSchema } from "../schema";

type Role = keyof typeof ROLE_LABELS;

type Props = {
  value?: Role;
  defaultValue?: Role;
  onValueChange?: (role: Role) => void;
  name?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

export function RoleSelect({ onValueChange, id, "aria-label": ariaLabel, ...props }: Props) {
  return (
    <Select
      {...props}
      onValueChange={(value) => {
        const parsed = roleSchema.safeParse(value);
        if (parsed.success) onValueChange?.(parsed.data);
      }}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roleSchema.options.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
