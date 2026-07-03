# rabang

這個服務用來把 Fubon Neo SDK 包成 HTTP / WebSocket API，讓行動 App 可以透過網路呼叫 SDK 功能，而不需要直接在行動端載入 Neo SDK。

## 安裝

```bash
bun install
```

## 啟動

```bash
bun run index.ts
```

服務啟動時會自動登入 FubonSDK。請提供以下環境變數：

```bash
FUBON_USER=your_personal_id
FUBON_PASSWORD=your_password
# 或使用 FUBON_APIKEY 取代 FUBON_PASSWORD
FUBON_CERT=/absolute/path/to/certificate.pfx
FUBON_CERT_PASS=optional_certificate_password
SERVER_TOKEN=optional_api_bearer_token
```

服務執行期間會維持 FubonSDK 登入狀態，並在關閉時呼叫 `logout()`。

若未提供 `SERVER_TOKEN`，服務會在啟動時產生一組 16 字元的 token，並直接印在 console。所有 HTTP endpoint 與 `/ws` WebSocket upgrade 都需要 Bearer Token：

```bash
Authorization: Bearer <token>
```

## 專案結構

- `index.ts`：服務啟動流程與關閉處理
- `src/config.ts`：環境變數、HTTP port、server token
- `src/fubon/session.ts`：FubonSDK 登入、行情初始化、登出 lifecycle
- `src/server.ts`：Bun server 與路由分派
- `src/routes/`：依 API 功能分組的 route handlers
- `src/http/`：共用 HTTP authentication 與 response helpers
- `src/trading/`：Trading API 共用 helper，例如帳戶選取
- `src/websocket/market-data.ts`：Market Data WebSocket bridge

## Market Data REST API

這些 API 的 path 與 query parameters 盡量維持和 Fubon Neo SDK market data Web API 一致。

### Snapshot

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

### 歷史行情

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/historical/candles/2330?timeframe=D&from=2024-01-01&to=2024-01-31&adjusted=true"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/historical/stats/2330"
```

### 日內行情、技術指標、股務事件

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

## Market Data WebSocket

WebSocket client 連線到 `/ws`，同樣需要 Bearer Token。Client 傳送的 message 形狀對齊 Fubon Neo SDK WebSocket API。

```json
{
  "event": "subscribe",
  "data": {
    "channel": "trades",
    "symbol": "2330"
  }
}
```

若要使用期權 WebSocket client，請在 `data` 中加入 `market: "futopt"`。未提供時預設為 `stock`。

```json
{
  "event": "unsubscribe",
  "data": {
    "id": "<subscription-id>"
  }
}
```

使用 `websocat` 測試：

```bash
websocat -H='Authorization: Bearer <token>' ws://localhost:3000/ws
```

## Trading API

Trading API 使用已登入的 FubonSDK session。預設使用登入後第一個 account；也可以用 query parameters 指定帳戶：

- `account`
- `branchNo`
- `accountType`

### 帳戶與帳務

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/accounts"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/accounting/inventories"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/accounting/settlement?range=3d"
```

### 股票交易查詢

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/order-results"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/order-results-detail"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/order-history?startDate=20260701&endDate=20260703"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/filled-history?startDate=20260701&endDate=20260703"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/batch-order-lists"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/batch-order-detail?functionType=0&date=20260703&batchSeqNo=<batch-seq-no>"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/margin-quota?symbol=2330"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/daytrade-and-stock-info?symbol=2330"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/symbol-quote?symbol=2330&marketType=Common"

curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/symbol-snapshot?marketType=Common&stockTypes=Stock,EtfAndEtn"
```
