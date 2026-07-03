import type { ServerContext } from "../types";

export function handleHealth(context: ServerContext): Response {
  return Response.json({
    ok: true,
    authenticated: true,
    accountCount: context.session.accounts.length,
  });
}
