// Auth.js endpoints (OAuth redirect / callback, sign-out, session).
// Authorization is handled by Auth.js itself.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
