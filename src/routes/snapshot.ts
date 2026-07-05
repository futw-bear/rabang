import { serviceUnavailableResponse, upstreamErrorResponse } from "../http/responses";
import type { ServerContext } from "../types";

type SnapshotParams = {
  market: string;
} & Record<string, string | number>;

export async function handleSnapshot(req: Request, url: URL, context: ServerContext): Promise<Response | null> {
  if (req.method !== "GET") {
    return null;
  }

  try {
    const quotesParams = getSnapshotParams(url, "/snapshot/quotes");
    if (quotesParams) {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const snapshot = session.sdk.marketdata.restClient.stock.snapshot;
      const result = await snapshot.quotes(quotesParams as Parameters<typeof snapshot.quotes>[0]);
      return Response.json(result);
    }

    const moversParams = getSnapshotParams(url, "/snapshot/movers");
    if (moversParams) {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const snapshot = session.sdk.marketdata.restClient.stock.snapshot;
      const result = await snapshot.movers(
        moversParams as unknown as Parameters<typeof snapshot.movers>[0]
      );
      return Response.json(result);
    }

    const activesParams = getSnapshotParams(url, "/snapshot/actives");
    if (activesParams) {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const snapshot = session.sdk.marketdata.restClient.stock.snapshot;
      const result = await snapshot.actives(
        activesParams as unknown as Parameters<typeof snapshot.actives>[0]
      );
      return Response.json(result);
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

function getSnapshotParams(url: URL, pathPrefix: string): SnapshotParams | null {
  if (!url.pathname.startsWith(`${pathPrefix}/`)) {
    return null;
  }

  const market = url.pathname.slice(pathPrefix.length + 1);
  if (!market || market.includes("/")) {
    return null;
  }

  const params: SnapshotParams = {
    market: decodeURIComponent(market),
  };

  for (const [name, value] of url.searchParams.entries()) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    params[name] = ["gt", "gte", "lt", "lte", "eq"].includes(name) ? Number(trimmed) : trimmed;
  }

  return params;
}
