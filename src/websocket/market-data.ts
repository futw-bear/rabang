import type { ServerWebSocket } from "bun";
import type { ServerContext } from "../types";

type MarketDataSocketData = {
  clientId: string;
};

type ClientMessage = {
  event?: string;
  data?: Record<string, unknown>;
  channel?: string;
  [key: string]: unknown;
};

type MarketDataClient = ServerWebSocket<MarketDataSocketData>;

type Market = "stock" | "futopt";

type SdkMarketDataClient = {
  connect: () => Promise<unknown>;
  subscribe: (params: { channel: string; [key: string]: unknown }) => void;
  unsubscribe: (params: { id?: string; ids?: string[] }) => void;
  subscriptions: () => void;
  ping: (params: { state?: unknown }) => void;
  on: (event: string, listener: (...args: any[]) => void) => unknown;
};

export type { MarketDataSocketData };

export class MarketDataWebSocketBridge {
  private readonly clients = new Set<MarketDataClient>();
  private stockConnected?: Promise<unknown>;
  private futoptConnected?: Promise<unknown>;
  private listenersAttached = false;

  constructor(private readonly context: ServerContext) {}

  addClient(ws: MarketDataClient) {
    this.clients.add(ws);
    this.sendJson(ws, {
      event: "ready",
      data: {
        clientId: ws.data.clientId,
      },
    });
  }

  removeClient(ws: MarketDataClient) {
    this.clients.delete(ws);
  }

  async handleMessage(ws: MarketDataClient, message: string | Buffer) {
    const parsed = parseClientMessage(message);
    if (!parsed) {
      this.sendError(ws, "Invalid JSON message.");
      return;
    }

    const event = parsed.event ?? (parsed.channel ? "subscribe" : undefined);
    const data = (parsed.data ?? parsed) as Record<string, unknown>;
    const market = readMarket(data);

    try {
      if (event === "subscribe") {
        await this.ensureConnected(market);
        this.getSdkClient(market).subscribe(toSdkSubscribeParams(data));
        this.sendJson(ws, { event: "subscribed", data });
        return;
      }

      if (event === "unsubscribe") {
        this.getSdkClient(market).unsubscribe(toSdkUnsubscribeParams(data));
        this.sendJson(ws, { event: "unsubscribed", data });
        return;
      }

      if (event === "subscriptions") {
        this.getSdkClient(market).subscriptions();
        return;
      }

      if (event === "ping") {
        this.getSdkClient(market).ping({ state: data.state });
        return;
      }

      this.sendError(ws, `Unsupported WebSocket event: ${event ?? "missing"}`);
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : "Unexpected WebSocket error.");
    }
  }

  private async ensureConnected(market: Market) {
    this.attachSdkListeners();

    if (market === "stock") {
      this.stockConnected ??= this.getSdkClient("stock").connect();
      await this.stockConnected;
      return;
    }

    this.futoptConnected ??= this.getSdkClient("futopt").connect();
    await this.futoptConnected;
  }

  private attachSdkListeners() {
    if (this.listenersAttached) {
      return;
    }

    this.listenersAttached = true;
    this.attachClientListeners("stock");
    this.attachClientListeners("futopt");
  }

  private attachClientListeners(market: Market) {
    const client = this.getSdkClient(market);

    client.on("message", (message: string) => {
      this.broadcastRaw(message);
    });
    client.on("error", (error: unknown) => {
      this.broadcastJson({
        event: "error",
        market,
        data: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    });
    client.on("disconnect", (event: unknown) => {
      this.broadcastJson({
        event: "disconnect",
        market,
        data: event,
      });
    });
  }

  private getSdkClient(market: Market) {
    const webSocketClient = this.context.session.sdk.marketdata.webSocketClient;
    return (market === "stock" ? webSocketClient.stock : webSocketClient.futopt) as SdkMarketDataClient;
  }

  private broadcastRaw(message: string) {
    for (const client of this.clients) {
      client.send(message);
    }
  }

  private broadcastJson(message: unknown) {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      client.send(payload);
    }
  }

  private sendJson(ws: MarketDataClient, message: unknown) {
    ws.send(JSON.stringify(message));
  }

  private sendError(ws: MarketDataClient, message: string) {
    this.sendJson(ws, {
      event: "error",
      data: {
        message,
      },
    });
  }
}

function parseClientMessage(message: string | Buffer): ClientMessage | null {
  try {
    return JSON.parse(typeof message === "string" ? message : message.toString()) as ClientMessage;
  } catch {
    return null;
  }
}

function readMarket(data: Record<string, unknown>): Market {
  return data.market === "futopt" ? "futopt" : "stock";
}

function toSdkSubscribeParams(data: Record<string, unknown>) {
  const { market: _market, ...params } = data;
  return params as { channel: string; [key: string]: unknown };
}

function toSdkUnsubscribeParams(data: Record<string, unknown>) {
  const { market: _market, ...params } = data;
  return params as { id?: string; ids?: string[] };
}
