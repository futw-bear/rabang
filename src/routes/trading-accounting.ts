import { upstreamErrorResponse } from "../http/responses";
import { optionalQueryParam, requireQueryParam, selectAccount } from "../trading/accounts";
import type { ServerContext } from "../types";

export function handleTradingAccounting(req: Request, url: URL, context: ServerContext): Response | null {
  if (req.method !== "GET") {
    return null;
  }

  if (url.pathname === "/trading/accounts") {
    return Response.json(context.session.accounts);
  }

  const account = selectAccount(url, context.session.accounts);
  if (account instanceof Response) {
    return account;
  }

  try {
    const accounting = context.session.sdk.accounting;

    if (url.pathname === "/trading/accounting/unrealized-gains-and-loses") {
      return Response.json(accounting.unrealizedGainsAndLoses(account));
    }

    if (url.pathname === "/trading/accounting/realized-gains-and-loses") {
      return Response.json(accounting.realizedGainsAndLoses(account));
    }

    if (url.pathname === "/trading/accounting/realized-gains-and-loses-summary") {
      return Response.json(accounting.realizedGainsAndLosesSummary(account));
    }

    if (url.pathname === "/trading/accounting/settlement") {
      const range = requireQueryParam(url, "range");
      if (range instanceof Response) {
        return range;
      }

      return Response.json(accounting.querySettlement(account, range));
    }

    if (url.pathname === "/trading/accounting/maintenance") {
      return Response.json(accounting.maintenance(account));
    }

    if (url.pathname === "/trading/accounting/inventories") {
      return Response.json(accounting.inventories(account));
    }

    if (url.pathname === "/trading/accounting/bank-remain") {
      return Response.json(accounting.bankRemain(account));
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
