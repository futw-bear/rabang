import type { Account, Response as FubonResponse } from "fubon-neo";
import type { AuthConfig } from "../config";
import type { AuthenticatedSession } from "../types";

export async function authenticate(config: AuthConfig): Promise<AuthenticatedSession> {
  const { FubonSDK } = await import("fubon-neo");
  const sdk = new FubonSDK();
  const response =
    config.secretKind === "apiKey"
      ? sdk.apikeyLogin(config.user, config.secret, config.certPath, config.certPass)
      : sdk.login(config.user, config.secret, config.certPath, config.certPass);

  const accounts = assertLoginSuccess(response);
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

function assertLoginSuccess(response: FubonResponse<Account[]>): Account[] {
  if (!response.isSuccess) {
    throw new Error(`Fubon authentication failed: ${response.message ?? "unknown error"}`);
  }

  return response.data ?? [];
}
