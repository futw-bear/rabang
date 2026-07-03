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

- `index.ts` is the current application entrypoint.
- `package.json` declares the local `fubon-neo` dependency from `fubon-neo-2.2.8.tgz`.
- `README.md` contains minimal setup and run instructions.
- `CLAUDE.md` contains Bun-specific development guidance.

If the server grows, prefer small modules grouped by responsibility, for example:

- HTTP route handlers
- WebSocket session handling
- Neo SDK client/facade code
- request/response schemas
- authentication and configuration

## Development Commands

```bash
bun install
bun run index.ts
bun test
```

Add package scripts when commands become repeated workflows, but keep Bun as the command runner.

## Neo SDK Integration

- Keep direct Neo SDK calls behind a narrow facade so route handlers do not depend on SDK-specific details.
- Validate all inbound HTTP bodies and WebSocket messages before calling Neo SDK methods.
- Normalize SDK errors into stable API error responses instead of leaking raw internal exceptions to mobile clients.
- Avoid storing account credentials, certificates, or tokens in source files.
- Load secrets and runtime configuration from environment variables; Bun loads `.env` automatically.
- Be careful with long-running SDK operations. Use timeouts, cancellation, and clear client-visible status messages where possible.

## HTTP and WebSocket API Guidance

- Use HTTP endpoints for login, account queries, order requests, and other discrete operations.
- Use WebSocket channels for market data, order status streams, connection events, and subscriptions.
- Keep payloads JSON-serializable unless a specific binary protocol is intentionally introduced.
- Version external API paths or message envelopes before making breaking changes.
- Document new endpoints and message formats in `README.md` or a dedicated docs file.

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
