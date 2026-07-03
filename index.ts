import { createServerToken, readAuthConfig, readServerPort } from "./src/config";
import { authenticate } from "./src/fubon/session";
import { startServer } from "./src/server";

const config = readAuthConfig();
const apiToken = createServerToken();
const session = await authenticate(config);
const server = startServer(readServerPort(), { apiToken, session });

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
