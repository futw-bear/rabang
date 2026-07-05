import type { ServerWebSocket } from "bun";
import type { AuthenticatedSession, ServerContext } from "../types";

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
  private activeSession?: AuthenticatedSession;
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
        const session = this.requireSession();
        this.getSdkClient(session, market).subscribe(toSdkSubscribeParams(data));
        this.sendJson(ws, { event: "subscribed", data });
        return;
      }

      if (event === "unsubscribe") {
        const session = this.requireSession();
        this.getSdkClient(session, market).unsubscribe(toSdkUnsubscribeParams(data));
        this.sendJson(ws, { event: "unsubscribed", data });
        return;
      }

      if (event === "subscriptions") {
        const session = this.requireSession();
        this.getSdkClient(session, market).subscriptions();
        return;
      }

      if (event === "ping") {
        const session = this.requireSession();
        this.getSdkClient(session, market).ping({ state: data.state });
        return;
      }

      this.sendError(ws, `Unsupported WebSocket event: ${event ?? "missing"}`);
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : "Unexpected WebSocket error.");
    }
  }

  private async ensureConnected(market: Market) {
    const session = this.requireSession();
    this.useSession(session);
    this.attachSdkListeners(session);

    if (market === "stock") {
      this.stockConnected ??= this.getSdkClient(session, "stock").connect();
      await this.stockConnected;
      return;
    }

    this.futoptConnected ??= this.getSdkClient(session, "futopt").connect();
    await this.futoptConnected;
  }

  private useSession(session: AuthenticatedSession) {
    if (this.activeSession === session) {
      return;
    }

    this.activeSession = session;
    this.stockConnected = undefined;
    this.futoptConnected = undefined;
    this.listenersAttached = false;
  }

  private attachSdkListeners(session: AuthenticatedSession) {
    if (this.listenersAttached) {
      return;
    }

    this.listenersAttached = true;
    this.attachClientListeners(session, "stock");
    this.attachClientListeners(session, "futopt");
  }

  private attachClientListeners(session: AuthenticatedSession, market: Market) {
    const client = this.getSdkClient(session, market);

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

  private requireSession(): AuthenticatedSession {
    const session = this.context.sessionManager.getSession();
    if (!session) {
      throw new Error("Fubon session is reconnecting.");
    }

    return session;
  }

  private getSdkClient(session: AuthenticatedSession, market: Market) {
    const webSocketClient = session.sdk.marketdata.webSocketClient;
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
