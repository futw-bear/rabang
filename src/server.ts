import { hasBearerToken, unauthorizedResponse } from "./http/auth";
import { notFoundResponse } from "./http/responses";
import { handleCorporateActions } from "./routes/corporate-actions";
import { handleHealth } from "./routes/health";
import { handleHistorical } from "./routes/historical";
import { handleIntraday } from "./routes/intraday";
import { handleSnapshot } from "./routes/snapshot";
import { handleTechnical } from "./routes/technical";
import type { ServerContext } from "./types";
import { MarketDataWebSocketBridge, type MarketDataSocketData } from "./websocket/market-data";

export function startServer(port: number, context: ServerContext): Bun.Server<MarketDataSocketData> {
  const marketDataBridge = new MarketDataWebSocketBridge(context);

  return Bun.serve({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);

      if (!hasBearerToken(req, context.apiToken)) {
        return unauthorizedResponse();
      }

      if (url.pathname === "/health") {
        return handleHealth(context);
      }

      const snapshotResponse = await handleSnapshot(req, url, context);
      if (snapshotResponse) {
        return snapshotResponse;
      }

      const historicalResponse = await handleHistorical(req, url, context);
      if (historicalResponse) {
        return historicalResponse;
      }

      const technicalResponse = await handleTechnical(req, url, context);
      if (technicalResponse) {
        return technicalResponse;
      }

      const corporateActionsResponse = await handleCorporateActions(req, url, context);
      if (corporateActionsResponse) {
        return corporateActionsResponse;
      }

      const intradayResponse = await handleIntraday(req, url, context);
      if (intradayResponse) {
        return intradayResponse;
      }

      if (url.pathname === "/ws") {
        const upgraded = server.upgrade(req, {
          data: {
            clientId: crypto.randomUUID(),
          },
        });
        if (upgraded) {
          return;
        }

        return Response.json(
          {
            error: "WebSocket upgrade failed",
          },
          { status: 400 }
        );
      }

      return notFoundResponse();
    },
    websocket: {
      open(ws) {
        marketDataBridge.addClient(ws);
      },
      message(ws, message) {
        void marketDataBridge.handleMessage(ws, message);
      },
      close(ws) {
        marketDataBridge.removeClient(ws);
      },
    },
  });
}
