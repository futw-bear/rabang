import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

export type AuthConfig = {
  user: string;
  secret: string;
  secretKind: "apiKey" | "password";
  certPath: string;
  certPass?: string;
  sdkOptions?: {
    pongInterval?: number;
    missedCount?: number;
    url?: string;
  };
  isTestEnv: boolean;
};

const tokenLength = 16;
const testEnvConfig: AuthConfig = {
  user: "41610792",
  secret: "12345678",
  secretKind: "password",
  certPath: "./cert/41610792.pfx",
  certPass: "12345678",
  sdkOptions: {
    pongInterval: 30,
    missedCount: 2,
    url: "wss://neoapitest.fbs.com.tw/TASP/XCPXWS",
  },
  isTestEnv: true,
};

export function readServerPort(): number {
  return Number(Bun.env.PORT ?? 3000);
}

export function readAuthConfig(): AuthConfig {
  if (Bun.env.FUBON_TESTENV?.trim() === "1") {
    assertCertExists(testEnvConfig.certPath, "FUBON_TESTENV certificate");
    return testEnvConfig;
  }

  const user = requireEnv("FUBON_USER");
  const certPath = requireEnv("FUBON_CERT");
  const apiKey = Bun.env.FUBON_APIKEY?.trim();
  const password = Bun.env.FUBON_PASSWORD?.trim();
  const certPass = Bun.env.FUBON_CERT_PASS?.trim();

  if (!apiKey && !password) {
    throw new Error("Missing required environment variable: FUBON_PASSWORD or FUBON_APIKEY");
  }

  assertCertExists(certPath, "FUBON_CERT");

  return {
    user,
    secret: apiKey ?? password!,
    secretKind: apiKey ? "apiKey" : "password",
    certPath,
    certPass: certPass || undefined,
    isTestEnv: false,
  };
}

export function createServerToken(): string {
  const configuredToken = Bun.env.SERVER_TOKEN?.trim();
  if (configuredToken) {
    return configuredToken;
  }

  return randomBytes(tokenLength).toString("base64url").slice(0, tokenLength);
}

function requireEnv(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertCertExists(certPath: string, label: string): void {
  if (!existsSync(certPath)) {
    throw new Error(`${label} does not point to an existing file: ${certPath}`);
  }
}
