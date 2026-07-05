import type { Account, FubonSDK } from "fubon-neo";

export type SessionStatus = "authenticated" | "reconnecting" | "stopped";

export type AuthenticatedSession = {
  sdk: FubonSDK;
  accounts: Account[];
  logout: () => void;
};

export type SessionState = {
  status: SessionStatus;
  authenticated: boolean;
  accountCount: number;
  lastHeartbeatAt?: string;
  lastLoginAt?: string;
  lastError?: string;
  nextReconnectAt?: string;
};

export type SessionProvider = {
  getSession: () => AuthenticatedSession | undefined;
  getState: () => SessionState;
};

export type ServerContext = {
  apiToken: string;
  sessionManager: SessionProvider;
};
