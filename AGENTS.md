# Repository Guidelines

## Project Purpose

This repository provides a bridge for using Fubon Neo SDK capabilities from mobile apps. Because the Neo SDK cannot be used directly inside the mobile runtime, this project should run a local or reachable HTTP/WebSocket server that exposes Neo SDK functions to the app through stable API endpoints and socket messages.

Keep the server boundary explicit: mobile clients should communicate with this service over HTTP for request/response operations and WebSocket for streaming, subscriptions, or long-lived updates.

## Runtime and Tooling

- Use Bun as the default runtime and package manager.
- Run TypeScript entrypoints with `bun <file>` or `bun run <script>`.
- Install dependencies with `bun install`.
- Use `bun test` for tests.
- Prefer Bun-native APIs such as `Bun.serve()` and built-in WebSocket support.
- Do not introduce Express, ws, dotenv, npm, yarn, or pnpm unless there is a strong project-specific reason.

## Project Structure

- `index.ts` is the service bootstrap. Keep it limited to reading config, authenticating, starting the server, and shutdown wiring.
- `package.json` declares the local `fubon-neo` dependency from `fubon-neo-2.2.8.tgz`.
- `README.md` contains setup, API, WebSocket, and curl usage examples.
- `CLAUDE.md` contains Bun-specific development guidance.
- `src/config.ts` owns environment variables, the HTTP port, and `SERVER_TOKEN` generation.
- `src/fubon/session.ts` owns the FubonSDK login/logout lifecycle and initializes market data clients.
- `src/server.ts` owns Bun server routing and WebSocket upgrade wiring.
- `src/routes/` contains route handlers grouped by API family.
- `src/http/` contains shared HTTP authentication and response helpers.
- `src/trading/` contains trading-specific shared helpers such as account selection.
- `src/websocket/market-data.ts` bridges client WebSocket subscriptions to the SDK WebSocket clients.

Keep new features grouped by API family. Do not add new endpoint logic directly to `index.ts`; add a focused route module and mount it from `src/server.ts`.

## Development Commands

```bash
bun install
bun run index.ts
bun test
```

Add package scripts when commands become repeated workflows, but keep Bun as the command runner.

## Neo SDK Integration

- When you need to understand Fubon Neo SDK functionality, use `https://www.fbs.com.tw/TradeAPI/llms.txt` as a reference source.
- Cross-check SDK behavior against local typings in `node_modules/fubon-neo/trade.d.ts` and `node_modules/@fugle/marketdata/lib/**`.
- Keep direct Neo SDK calls behind a narrow facade so route handlers do not depend on SDK-specific details.
- Validate all inbound HTTP bodies and WebSocket messages before calling Neo SDK methods.
- Normalize SDK errors into stable API error responses instead of leaking raw internal exceptions to mobile clients.
- Avoid storing account credentials, certificates, or tokens in source files.
- Load secrets and runtime configuration from environment variables; Bun loads `.env` automatically.
- Be careful with long-running SDK operations. Use timeouts, cancellation, and clear client-visible status messages where possible.
- Trading APIs require an authenticated `Account`. Reuse the shared account selection helper in `src/trading/accounts.ts` instead of duplicating account matching.
- Market data REST routes should keep paths and query parameter names aligned with the Fubon Neo SDK market data Web API.

## HTTP and WebSocket API Guidance

- Every HTTP endpoint and `/ws` upgrade requires `Authorization: Bearer <token>`.
- `SERVER_TOKEN` overrides the API token. If it is missing, the service generates a 16-character token at startup and prints it to the console.
- Authentication with FubonSDK happens at service startup using `FUBON_USER`, `FUBON_CERT`, and either `FUBON_PASSWORD` or `FUBON_APIKEY`; `FUBON_CERT_PASS` is optional.
- Use HTTP endpoints for account queries, order status queries, market data REST calls, and other discrete operations.
- Use `/ws` for market data streaming. Client messages should match the SDK WebSocket API shape, for example `{ "event": "subscribe", "data": { "channel": "trades", "symbol": "2330" } }`.
- Keep payloads JSON-serializable unless a specific binary protocol is intentionally introduced.
- Version external API paths or message envelopes before making breaking changes.
- Document new endpoints and message formats in `README.md` or a dedicated docs file.

Current route groups:

- Market data REST: `/snapshot/*`, `/historical/*`, `/intraday/*`, `/technical/*`, `/corporate-actions/*`
- Market data WebSocket: `/ws`
- Trading accounts and accounting: `/trading/accounts`, `/trading/accounting/*`
- Trading stock query APIs: `/trading/stock/*`

## Testing Expectations

- Add focused tests for request validation, message parsing, SDK facade behavior, and error normalization.
- Mock or wrap Neo SDK calls in tests instead of requiring live brokerage credentials.
- For WebSocket behavior, test subscription lifecycle, malformed messages, disconnect cleanup, and error paths.
- Run `bun test` before handing off changes when tests exist.

## Security Notes

- Treat this service as a sensitive bridge to brokerage functionality.
- Do not log secrets, certificate passwords, access tokens, full account numbers, or raw credential payloads.
- Require explicit authentication or network access control before exposing the server beyond a trusted local environment.
- Validate origin, session identity, and message authorization for WebSocket clients.
- Prefer least-privilege configuration and fail closed when required credentials or SDK state are missing.

## Coding Style

- Keep TypeScript types explicit at API boundaries.
- Prefer simple, readable modules over premature abstraction.
- Use structured errors and consistent response shapes.
- Keep comments concise and only where they clarify non-obvious SDK, protocol, or concurrency behavior.
- Preserve existing Bun-first conventions from `CLAUDE.md`.
