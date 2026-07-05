import { serviceUnavailableResponse, upstreamErrorResponse } from "../http/responses";
import type { ServerContext } from "../types";

type CorporateActionParams = Record<string, string>;

export async function handleCorporateActions(
  req: Request,
  url: URL,
  context: ServerContext
): Promise<Response | null> {
  if (req.method !== "GET") {
    return null;
  }

  try {
    if (url.pathname === "/corporate-actions/capital-changes") {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const corporateActions = session.sdk.marketdata.restClient.stock.corporateActions;
      const params = getQueryParams(url);
      const result = await corporateActions.capitalChanges(params);
      return Response.json(result);
    }

    if (url.pathname === "/corporate-actions/dividends") {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const corporateActions = session.sdk.marketdata.restClient.stock.corporateActions;
      const params = getQueryParams(url);
      const result = await corporateActions.dividends(params);
      return Response.json(result);
    }

    if (url.pathname === "/corporate-actions/listing-applicants") {
      const session = context.sessionManager.getSession();
      if (!session) {
        return serviceUnavailableResponse("Fubon session is reconnecting.");
      }

      const corporateActions = session.sdk.marketdata.restClient.stock.corporateActions;
      const params = getQueryParams(url);
      const result = await corporateActions.listingApplicants(params);
      return Response.json(result);
    }

    return null;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

function getQueryParams(url: URL): CorporateActionParams {
  const params: CorporateActionParams = {};

  for (const [name, value] of url.searchParams.entries()) {
    const trimmed = value.trim();
    if (trimmed) {
      params[name] = trimmed;
    }
  }

  return params;
}
