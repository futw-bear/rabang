import type { Account, FubonSDK } from "fubon-neo";

export type AuthenticatedSession = {
  sdk: FubonSDK;
  accounts: Account[];
  logout: () => void;
};

export type ServerContext = {
  apiToken: string;
  session: AuthenticatedSession;
};
