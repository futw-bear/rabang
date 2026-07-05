import type { ServerContext } from "../types";

export function handleHealth(context: ServerContext): Response {
  const state = context.sessionManager.getState();
  const connected = state.status === "authenticated";

  return Response.json(
    {
      ok: connected,
      // message: connected ? "Fubon session is connected." : "目前無法正常連線，服務正在嘗試重新登入 FubonSDK。",
      message: connected ? "Fubon session is connected." : "Fubon service is unavailable.",
      ...state,
    },
    { status: connected ? 200 : 503 }
  );
}
