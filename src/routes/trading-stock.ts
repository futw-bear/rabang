import { serviceUnavailableResponse, upstreamErrorResponse } from "../http/responses";
import { optionalQueryParam, requireQueryParam, selectAccount } from "../trading/accounts";
import type { ServerContext } from "../types";
import type { BatchResult, MarketType, StockType } from "fubon-neo";

export function handleTradingStock(req: Request, url: URL, context: ServerContext): Response | null {
  if (req.method !== "GET") {
    return null;
  }

  if (!url.pathname.startsWith("/trading/stock/")) {
    return null;
  }

  const session = context.sessionManager.getSession();
  if (!session) {
    return serviceUnavailableResponse("Fubon session is reconnecting.");
  }

  const account = selectAccount(url, session.accounts);
  if (account instanceof Response) {
    return account;
  }

  const stock = session.sdk.stock;

  try {
    if (url.pathname === "/trading/stock/order-results") {
      return Response.json(stock.getOrderResults(account));
    }

    if (url.pathname === "/trading/stock/order-results-detail") {
      return Response.json(stock.getOrderResultsDetail(account));
    }

    if (url.pathname === "/trading/stock/order-history") {
      const startDate = requireQueryParam(url, "startDate");
      if (startDate instanceof Response) {
        return startDate;
      }

      return Response.json(stock.orderHistory(account, startDate, optionalQueryParam(url, "endDate")));
    }

    if (url.pathname === "/trading/stock/filled-history") {
      return Response.json(
        stock.filledHistory(account, optionalQueryParam(url, "startDate"), optionalQueryParam(url, "endDate"))
      );
    }

    if (url.pathname === "/trading/stock/batch-order-lists") {
      return Response.json(stock.batchOrderLists(account));
    }

    if (url.pathname === "/trading/stock/batch-order-detail") {
      const batch = readBatchResult(url, account);
      if (batch instanceof Response) {
        return batch;
      }

      return Response.json(stock.batchOrderDetail(account, batch));
    }

    if (url.pathname === "/trading/stock/margin-quota") {
      const symbol = requireQueryParam(url, "symbol");
      if (symbol instanceof Response) {
        return symbol;
      }

      return Response.json(stock.marginQuota(account, symbol));
    }

    if (url.pathname === "/trading/stock/daytrade-and-stock-info") {
      const symbol = requireQueryParam(url, "symbol");
      if (symbol instanceof Response) {
        return symbol;
      }

      return Response.json(stock.daytradeAndStockInfo(account, symbol));
    }

    if (url.pathname === "/trading/stock/symbol-quote") {
      const symbol = requireQueryParam(url, "symbol");
      if (symbol instanceof Response) {
        return symbol;
      }

      return Response.json(stock.querySymbolQuote(account, symbol, readMarketType(url)));
    }

    if (url.pathname === "/trading/stock/symbol-snapshot") {
      return Response.json(stock.querySymbolSnapshot(account, readMarketType(url), readStockTypes(url)));
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

function readMarketType(url: URL): MarketType | undefined {
  return optionalQueryParam(url, "marketType") as MarketType | undefined;
}

function readBatchResult(url: URL, account: { branchNo: string; account: string }): BatchResult | Response {
  const functionType = requireQueryParam(url, "functionType");
  if (functionType instanceof Response) {
    return functionType;
  }

  const date = requireQueryParam(url, "date");
  if (date instanceof Response) {
    return date;
  }

  const batchSeqNo = requireQueryParam(url, "batchSeqNo");
  if (batchSeqNo instanceof Response) {
    return batchSeqNo;
  }

  return {
    functionType: Number(functionType),
    date,
    batchSeqNo,
    branchNo: optionalQueryParam(url, "batchBranchNo") ?? account.branchNo,
    account: optionalQueryParam(url, "batchAccount") ?? account.account,
  };
}

function readStockTypes(url: URL): StockType[] | undefined {
  const value = optionalQueryParam(url, "stockTypes");
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as StockType[];
}
