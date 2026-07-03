import { upstreamErrorResponse } from "../http/responses";
import type { ServerContext } from "../types";

type IntradayParams = Record<string, string | number | boolean>;

const numberParams = new Set(["offset", "limit"]);
const booleanParams = new Set(["isNormal", "isAttention", "isDisposition", "isHalted", "isTrial"]);

export async function handleIntraday(req: Request, url: URL, context: ServerContext): Promise<Response | null> {
  if (req.method !== "GET") {
    return null;
  }

  const intraday = context.session.sdk.marketdata.restClient.stock.intraday;

  try {
    if (url.pathname === "/intraday/tickers") {
      const result = await intraday.tickers(
        getQueryParams(url) as unknown as Parameters<typeof intraday.tickers>[0]
      );
      return Response.json(result);
    }

    const tickerParams = getSymbolParams(url, "/intraday/ticker");
    if (tickerParams) {
      const result = await intraday.ticker(tickerParams as unknown as Parameters<typeof intraday.ticker>[0]);
      return Response.json(result);
    }

    const quoteParams = getSymbolParams(url, "/intraday/quote");
    if (quoteParams) {
      const result = await intraday.quote(quoteParams as unknown as Parameters<typeof intraday.quote>[0]);
      return Response.json(result);
    }

    const candlesParams = getSymbolParams(url, "/intraday/candles");
    if (candlesParams) {
      const result = await intraday.candles(
        candlesParams as unknown as Parameters<typeof intraday.candles>[0]
      );
      return Response.json(result);
    }

    const tradesParams = getSymbolParams(url, "/intraday/trades");
    if (tradesParams) {
      const result = await intraday.trades(tradesParams as unknown as Parameters<typeof intraday.trades>[0]);
      return Response.json(result);
    }

    const volumesParams = getSymbolParams(url, "/intraday/volumes");
    if (volumesParams) {
      const result = await intraday.volumes(
        volumesParams as unknown as Parameters<typeof intraday.volumes>[0]
      );
      return Response.json(result);
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

function getSymbolParams(url: URL, pathPrefix: string): IntradayParams | null {
  if (!url.pathname.startsWith(`${pathPrefix}/`)) {
    return null;
  }

  const symbol = url.pathname.slice(pathPrefix.length + 1);
  if (!symbol || symbol.includes("/")) {
    return null;
  }

  return {
    symbol: decodeURIComponent(symbol),
    ...getQueryParams(url),
  };
}

function getQueryParams(url: URL): IntradayParams {
  const params: IntradayParams = {};

  for (const [name, value] of url.searchParams.entries()) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    if (numberParams.has(name)) {
      params[name] = Number(trimmed);
    } else if (booleanParams.has(name)) {
      params[name] = trimmed === "true";
    } else {
      params[name] = trimmed;
    }
  }

  return params;
}
