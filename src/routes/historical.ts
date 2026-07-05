import { serviceUnavailableResponse, upstreamErrorResponse } from "../http/responses";
import type { ServerContext } from "../types";

type HistoricalParams = {
  symbol: string;
} & Record<string, string | boolean>;

export async function handleHistorical(req: Request, url: URL, context: ServerContext): Promise<Response | null> {
  if (req.method !== "GET") {
    return null;
  }

  try {
    const candlesParams = getHistoricalParams(url, "/historical/candles");
    if (candlesParams) {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const historical = session.sdk.marketdata.restClient.stock.historical;
      const result = await historical.candles(
        candlesParams as unknown as Parameters<typeof historical.candles>[0]
      );
      return Response.json(result);
    }

    const statsParams = getHistoricalParams(url, "/historical/stats");
    if (statsParams) {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const historical = session.sdk.marketdata.restClient.stock.historical;
      const result = await historical.stats(
        statsParams as Parameters<typeof historical.stats>[0]
      );
      return Response.json(result);
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

function getHistoricalParams(url: URL, pathPrefix: string): HistoricalParams | null {
  if (!url.pathname.startsWith(`${pathPrefix}/`)) {
    return null;
  }

  const symbol = url.pathname.slice(pathPrefix.length + 1);
  if (!symbol || symbol.includes("/")) {
    return null;
  }

  const params: HistoricalParams = {
    symbol: decodeURIComponent(symbol),
  };

  for (const [name, value] of url.searchParams.entries()) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    params[name] = name === "adjusted" ? trimmed === "true" : trimmed;
  }

  return params;
}
