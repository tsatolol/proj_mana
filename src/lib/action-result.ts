// Return type for Server Actions called from forms.
// Authorization failures are thrown (see authz.ts); expected failures such as
// validation errors are returned so the form can display them.
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
