import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import type { Account, FubonSDK, Response as FubonResponse } from "fubon-neo";

type AuthConfig = {
  user: string;
  secret: string;
  secretKind: "apiKey" | "password";
  certPath: string;
  certPass?: string;
};

type AuthenticatedSession = {
  sdk: FubonSDK;
  accounts: Account[];
  logout: () => void;
};

type ServerContext = {
  apiToken: string;
  session: AuthenticatedSession;
};

const serverPort = Number(Bun.env.PORT ?? 3000);
const tokenLength = 16;

function requireEnv(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readAuthConfig(): AuthConfig {
  const user = requireEnv("FUBON_USER");
  const certPath = requireEnv("FUBON_CERT");
  const apiKey = Bun.env.FUBON_APIKEY?.trim();
  const password = Bun.env.FUBON_PASSWORD?.trim();
  const certPass = Bun.env.FUBON_CERT_PASS?.trim();

  if (!apiKey && !password) {
    throw new Error("Missing required environment variable: FUBON_PASSWORD or FUBON_APIKEY");
  }

  if (!existsSync(certPath)) {
    throw new Error(`FUBON_CERT does not point to an existing file: ${certPath}`);
  }

  return {
    user,
    secret: apiKey ?? password!,
    secretKind: apiKey ? "apiKey" : "password",
    certPath,
    certPass: certPass || undefined,
  };
}

function createServerToken(): string {
  const configuredToken = Bun.env.SERVER_TOKEN?.trim();
  if (configuredToken) {
    return configuredToken;
  }

  return randomBytes(tokenLength).toString("base64url").slice(0, tokenLength);
}

function hasBearerToken(req: Request, token: string): boolean {
  return req.headers.get("authorization") === `Bearer ${token}`;
}

function unauthorizedResponse(): Response {
  return Response.json(
    {
      error: "Unauthorized",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="rabang"',
      },
    }
  );
}

function assertLoginSuccess(response: FubonResponse<Account[]>): Account[] {
  if (!response.isSuccess) {
    throw new Error(`Fubon authentication failed: ${response.message ?? "unknown error"}`);
  }

  return response.data ?? [];
}

async function authenticate(config: AuthConfig): Promise<AuthenticatedSession> {
  const { FubonSDK } = await import("fubon-neo");
  const sdk = new FubonSDK();
  const response =
    config.secretKind === "apiKey"
      ? sdk.apikeyLogin(config.user, config.secret, config.certPath, config.certPass)
      : sdk.login(config.user, config.secret, config.certPath, config.certPass);

  const accounts = assertLoginSuccess(response);
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

function startServer(context: ServerContext): Bun.Server<undefined> {
  return Bun.serve({
    port: serverPort,
    fetch(req, server) {
      const url = new URL(req.url);

      if (!hasBearerToken(req, context.apiToken)) {
        return unauthorizedResponse();
      }

      if (url.pathname === "/health") {
        return Response.json({
          ok: true,
          authenticated: true,
          accountCount: context.session.accounts.length,
        });
      }

      if (url.pathname === "/ws") {
        const upgraded = server.upgrade(req);
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

      return Response.json(
        {
          error: "Not Found",
        },
        { status: 404 }
      );
    },
    websocket: {
      message(ws, message) {
        ws.send(
          JSON.stringify({
            type: "echo",
            data: message,
          })
        );
      },
    },
  });
}

const config = readAuthConfig();
const apiToken = createServerToken();
const session = await authenticate(config);
const server = startServer({ apiToken, session });

console.info(
  `FubonSDK authenticated with ${config.secretKind}; ${session.accounts.length} account(s) available.`
);
console.info(`API Bearer Token: ${apiToken}`);
console.info(`Server listening on http://localhost:${server.port}`);

function shutdown(signal: NodeJS.Signals) {
  console.info(`Received ${signal}; shutting down.`);
  server.stop(true);
  session.logout();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
process.once("beforeExit", () => {
  session.logout();
});
