import { upstreamErrorResponse } from "../http/responses";
import type { ServerContext } from "../types";

type TechnicalParams = {
  symbol: string;
} & Record<string, string | number>;

const numberParams = new Set(["period", "rPeriod", "kPeriod", "dPeriod", "fast", "slow", "signal"]);

export async function handleTechnical(req: Request, url: URL, context: ServerContext): Promise<Response | null> {
  if (req.method !== "GET") {
    return null;
  }

  const technical = context.session.sdk.marketdata.restClient.stock.technical;

  try {
    const smaParams = getTechnicalParams(url, "/technical/sma");
    if (smaParams) {
      const result = await technical.sma(smaParams as unknown as Parameters<typeof technical.sma>[0]);
      return Response.json(result);
    }

    const rsiParams = getTechnicalParams(url, "/technical/rsi");
    if (rsiParams) {
      const result = await technical.rsi(rsiParams as unknown as Parameters<typeof technical.rsi>[0]);
      return Response.json(result);
    }

    const kdjParams = getTechnicalParams(url, "/technical/kdj");
    if (kdjParams) {
      const result = await technical.kdj(kdjParams as unknown as Parameters<typeof technical.kdj>[0]);
      return Response.json(result);
    }

    const macdParams = getTechnicalParams(url, "/technical/macd");
    if (macdParams) {
      const result = await technical.macd(macdParams as unknown as Parameters<typeof technical.macd>[0]);
      return Response.json(result);
    }

    const bbParams = getTechnicalParams(url, "/technical/bb");
    if (bbParams) {
      const result = await technical.bb(bbParams as unknown as Parameters<typeof technical.bb>[0]);
      return Response.json(result);
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

function getTechnicalParams(url: URL, pathPrefix: string): TechnicalParams | null {
  if (!url.pathname.startsWith(`${pathPrefix}/`)) {
    return null;
  }

  const symbol = url.pathname.slice(pathPrefix.length + 1);
  if (!symbol || symbol.includes("/")) {
    return null;
  }

  const params: TechnicalParams = {
    symbol: decodeURIComponent(symbol),
  };

  for (const [name, value] of url.searchParams.entries()) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    params[name] = numberParams.has(name) ? Number(trimmed) : trimmed;
  }

  return params;
}
