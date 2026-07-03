import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

export type AuthConfig = {
  user: string;
  secret: string;
  secretKind: "apiKey" | "password";
  certPath: string;
  certPass?: string;
};

const tokenLength = 16;

export function readServerPort(): number {
  return Number(Bun.env.PORT ?? 3000);
}

export function readAuthConfig(): AuthConfig {
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
