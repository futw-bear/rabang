import type { Account, Response as FubonResponse } from "fubon-neo";
import type { AuthConfig } from "../config";
import type { AuthenticatedSession, SessionState, SessionStatus } from "../types";

const heartbeatTimeoutMs = 3 * 60 * 1000;
const heartbeatCheckMs = 30 * 1000;
const initialReconnectDelayMs = 5 * 1000;
const maxReconnectDelayMs = 15 * 60 * 1000;

type AuthenticateOptions = {
  onHeartbeat?: (code: string, message: string) => void;
};

type AuthConfigReader = () => AuthConfig;

export async function authenticate(
  config: AuthConfig,
  options: AuthenticateOptions = {}
): Promise<AuthenticatedSession> {
  const { FubonSDK } = await import("fubon-neo");
  const sdk = new FubonSDK(
    config.sdkOptions?.pongInterval ?? 30,
    config.sdkOptions?.missedCount ?? 6,
    config.sdkOptions?.url
  );
  const response =
    config.secretKind === "apiKey"
      ? sdk.apikeyLogin(config.user, config.secret, config.certPath, config.certPass)
      : sdk.login(config.user, config.secret, config.certPath, config.certPass);

  const accounts = assertLoginSuccess(response);
  sdk.setOnEvent((code, message) => {
    options.onHeartbeat?.(code, message);
  });
  sdk.initRealtime();
  let loggedOut = false;

  return {
    sdk,
    accounts,
    logout: () => {
      if (loggedOut) {
        return;
      }

      loggedOut = true;
      const ok = sdk.logout();
      if (!ok) {
        console.warn("Fubon logout returned false.");
      }
    },
  };
}

export class SessionManager {
  private session?: AuthenticatedSession;
  private status: SessionStatus = "reconnecting";
  private lastHeartbeatAt?: number;
  private lastLoginAt?: number;
  private lastError?: string;
  private nextReconnectAt?: number;
  private reconnectAttempt = 0;
  private reconnectTimer?: Timer;
  private heartbeatTimer?: Timer;
  private loginInFlight = false;

  constructor(private readonly readConfig: AuthConfigReader) {}

  start() {
    this.heartbeatTimer = setInterval(() => this.checkHeartbeat(), heartbeatCheckMs);
    this.reconnectNow("startup");
  }

  stop() {
    this.status = "stopped";
    this.clearReconnectTimer();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    this.replaceSession(undefined);
  }

  getSession(): AuthenticatedSession | undefined {
    return this.session;
  }

  getState(): SessionState {
    return {
      status: this.status,
      authenticated: Boolean(this.session),
      accountCount: this.session?.accounts.length ?? 0,
      lastHeartbeatAt: toIsoString(this.lastHeartbeatAt),
      lastLoginAt: toIsoString(this.lastLoginAt),
      lastError: this.lastError,
      nextReconnectAt: toIsoString(this.nextReconnectAt),
    };
  }

  private markHeartbeat() {
    this.lastHeartbeatAt = Date.now();
  }

  private checkHeartbeat() {
    if (this.status !== "authenticated" || !this.lastHeartbeatAt) {
      return;
    }

    const elapsedMs = Date.now() - this.lastHeartbeatAt;
    if (elapsedMs <= heartbeatTimeoutMs) {
      return;
    }

    console.warn("Fubon heartbeat timed out; entering reconnect state.");
    this.enterReconnect("Fubon heartbeat timed out.");
    this.reconnectNow("heartbeat-timeout");
  }

  private enterReconnect(message: string) {
    this.status = "reconnecting";
    this.lastError = message;
    this.replaceSession(undefined);
    console.warn(`Fubon session entered reconnect state: ${message}`);
  }

  private reconnectNow(reason: string) {
    if (this.status === "stopped" || this.loginInFlight) {
      return;
    }

    this.status = "reconnecting";
    this.clearReconnectTimer();
    this.loginInFlight = true;
    console.info(
      `Fubon authentication attempt started: reason=${reason}, attempt=${this.reconnectAttempt + 1}`
    );

    void Promise.resolve()
      .then(() => {
        const config = this.readConfig();
        console.info(
          `Fubon authentication config loaded: environment=${
            config.isTestEnv ? "test" : "configured"
          }, secretKind=${config.secretKind}`
        );

        return authenticate(config, {
          onHeartbeat: () => this.markHeartbeat(),
        });
      })
      .then((session) => {
        if (this.status === "stopped") {
          session.logout();
          return;
        }

        this.replaceSession(session);
        this.status = "authenticated";
        this.lastHeartbeatAt = Date.now();
        this.lastLoginAt = this.lastHeartbeatAt;
        this.lastError = undefined;
        this.nextReconnectAt = undefined;
        this.reconnectAttempt = 0;
        console.info(
          `FubonSDK authenticated after ${reason}; ${session.accounts.length} account(s) available.`
        );
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Fubon authentication failed.";
        this.enterReconnect(message);
        this.scheduleReconnect();
      })
      .finally(() => {
        this.loginInFlight = false;
      });
  }

  private scheduleReconnect() {
    if (this.status === "stopped") {
      return;
    }

    const delayMs = Math.min(
      initialReconnectDelayMs * 1.1 ** this.reconnectAttempt,
      maxReconnectDelayMs
    );
    this.reconnectAttempt += 1;
    this.nextReconnectAt = Date.now() + delayMs;
    console.info(
      `Next Fubon reconnect attempt scheduled in ${Math.round(delayMs / 1000)}s at ${toIsoString(
        this.nextReconnectAt
      )}.`
    );
    this.reconnectTimer = setTimeout(() => this.reconnectNow("scheduled-reconnect"), delayMs);
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private replaceSession(nextSession: AuthenticatedSession | undefined) {
    const previousSession = this.session;
    this.session = nextSession;
    if (previousSession && previousSession !== nextSession) {
      previousSession.logout();
    }
  }
}

function assertLoginSuccess(response: FubonResponse<Account[]>): Account[] {
  if (!response.isSuccess) {
    throw new Error(`Fubon authentication failed: ${response.message ?? "unknown error"}`);
  }

  return response.data ?? [];
}

function toIsoString(timestamp: number | undefined): string | undefined {
  return timestamp ? new Date(timestamp).toISOString() : undefined;
}
