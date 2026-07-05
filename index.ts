import { createServerToken, readAuthConfig, readServerPort } from "./src/config";
import { SessionManager } from "./src/fubon/session";
import { startServer } from "./src/server";

const apiToken = createServerToken();
const sessionManager = new SessionManager(readAuthConfig);
const server = startServer(readServerPort(), { apiToken, sessionManager });
sessionManager.start();

console.info(`API Bearer Token: ${apiToken}`);
console.info(`Server listening on http://localhost:${server.port}`);
console.info("FubonSDK authentication is running in the background.");

function shutdown(signal: NodeJS.Signals) {
  console.info(`Received ${signal}; shutting down.`);
  server.stop(true);
  sessionManager.stop();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
process.once("beforeExit", () => {
  sessionManager.stop();
});
