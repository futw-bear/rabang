# rabang

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

Authentication is performed automatically at startup. Provide these environment variables:

```bash
FUBON_USER=your_personal_id
FUBON_PASSWORD=your_password
# or use FUBON_APIKEY instead of FUBON_PASSWORD
FUBON_CERT=/absolute/path/to/certificate.pfx
FUBON_CERT_PASS=optional_certificate_password
SERVER_TOKEN=optional_api_bearer_token
```

The service keeps the FubonSDK session logged in while it is running and calls `logout()` during shutdown.
If `SERVER_TOKEN` is not provided, the service generates a 16-character token at startup and prints it to the console. Use it as the API bearer token for every endpoint, including `GET /health`:

```bash
Authorization: Bearer <token>
```

Source files are grouped by responsibility:

- `index.ts`: service bootstrap and shutdown wiring
- `src/config.ts`: environment variables and server token
- `src/fubon/session.ts`: FubonSDK authentication lifecycle
- `src/server.ts`: Bun server routing shell
- `src/routes/`: API handlers grouped by feature
- `src/http/`: shared HTTP authentication and response helpers

Snapshot APIs use the same paths and parameters as the Fubon Neo SDK market data API:

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/snapshot/quotes/TSE?type=COMMONSTOCK"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/snapshot/movers/TSE?direction=up&change=percent&type=COMMONSTOCK"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/snapshot/actives/TSE?trade=value&type=COMMONSTOCK"
```

Historical APIs use the same paths and parameters as the Fubon Neo SDK market data API:

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/historical/candles/2330?timeframe=D&from=2024-01-01&to=2024-01-31&adjusted=true"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/historical/stats/2330"
```

Intraday, technical, and corporate actions APIs also use the same paths and parameters as the Fubon Neo SDK market data API:

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/intraday/ticker/2330"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/intraday/tickers?type=EQUITY&exchange=TWSE"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/technical/sma/2330?timeframe=D&period=5"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/corporate-actions/dividends?start_date=2024-01-01&end_date=2024-12-31"
```

Market data WebSocket clients connect to `/ws` with the same bearer token and send messages that match the Fubon Neo SDK WebSocket API shape:

```json
{
  "event": "subscribe",
  "data": {
    "channel": "trades",
    "symbol": "2330"
  }
}
```

Use `market: "futopt"` inside `data` to subscribe through the futures and options WebSocket client. If omitted, `market` defaults to `stock`.

```json
{
  "event": "unsubscribe",
  "data": {
    "id": "<subscription-id>"
  }
}
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
