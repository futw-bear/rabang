# Rabang

將 Fubon Neo SDK 轉換為普通的 HTTP API 與 WebSocket。

## 安裝

```bash
bun install
```

## 啟動

```bash
bun run index.ts
```

服務啟動後會在背景登入 FubonSDK。請提供以下環境變數：

```bash
FUBON_USER=your_personal_id
FUBON_PASSWORD=your_password
# 或使用 FUBON_APIKEY 取代 FUBON_PASSWORD
FUBON_CERT=/absolute/path/to/certificate.pfx
FUBON_CERT_PASS=optional_certificate_password
SERVER_TOKEN=optional_api_bearer_token
```

若要使用官方測試伺服器與測試帳號登入，可以改用：

```bash
FUBON_TESTENV=1 bun run index.ts
```

`FUBON_TESTENV=1` 會使用 `new FubonSDK(30, 2, "wss://neoapitest.fbs.com.tw/TASP/XCPXWS")`，並套用官方測試帳號、密碼與 `./cert/41610792.pfx` 測試憑證；此模式不需要設定 `FUBON_USER`、`FUBON_PASSWORD`、`FUBON_CERT` 或 `FUBON_CERT_PASS`。如果測試憑證暫時不存在或登入失敗，服務仍會啟動並進入 reconnect 狀態，依照同一套重試間隔持續嘗試登入。

服務執行期間會維持 FubonSDK 登入狀態，並在關閉時呼叫 `logout()`。即使登入失敗，HTTP/WebSocket server 仍會啟動；此時 session 狀態會進入 `reconnecting`，需要 SDK session 的 API 會回傳 `503`，`/health` 也會以 `503` 回傳目前無法正常連線的狀態訊息。

登入成功後，服務會監控 SDK 底層事件作為 heartbeat。若超過 3 分鐘沒有收到 heartbeat，服務會登出目前 session 並進入 `reconnecting`。重新登入會從 5 秒後開始重試，每次將間隔拉長 10%，最多每 15 分鐘重試一次，直到登入成功為止。

若未提供 `SERVER_TOKEN`，服務會在啟動時產生一組 16 字元的 token，並直接印在 console。所有 HTTP endpoint 與 `/ws` WebSocket upgrade 都需要 Bearer Token：

```bash
Authorization: Bearer <token>
```

## Docker

獲取 image：

```bash
docker pull ghcr.io/futw-bear/rabang:latest
```

啟動服務（密碼）：

```bash
docker run --rm \
  -p 3000:3000 \
  -e FUBON_USER=your_personal_id \
  -e FUBON_PASSWORD=your_password \
  -e FUBON_CERT_PASS=optional_certificate_password \
  -e SERVER_TOKEN=optional_api_bearer_token \
  -v /path/to/cert.p12:/certs/fubon.p12:ro \
  ghcr.io/futw-bear/rabang
```

啟動服務（API Key）：

```bash
docker run --rm \
  -p 3000:3000 \
  -e FUBON_USER=your_personal_id \
  -e FUBON_APIKEY=your_api_key \
  -e FUBON_CERT_PASS=optional_certificate_password \
  -e SERVER_TOKEN=optional_api_bearer_token \
  -v /path/to/cert.p12:/certs/fubon.p12:ro \
  ghcr.io/futw-bear/rabang
```

## 專案結構

- `index.ts`：服務啟動流程與關閉處理
- `src/config.ts`：環境變數、HTTP port、server token
- `src/fubon/session.ts`：FubonSDK 登入、行情初始化、heartbeat 監控、reconnect、登出 lifecycle
- `src/server.ts`：Bun server 與路由分派
- `src/routes/`：依 API 功能分組的 route handlers
- `src/http/`：共用 HTTP authentication 與 response helpers
- `src/trading/`：Trading API 共用 helper，例如帳戶選取
- `src/websocket/market-data.ts`：Market Data WebSocket bridge

## API 共通規則

所有 HTTP endpoint 與 `/ws` WebSocket upgrade 都需要：

```bash
Authorization: Bearer <token>
```

HTTP 查詢 API 目前皆使用 `GET`。除非表格特別註明，query parameters 會直接轉交到對應的 Fubon Neo SDK 方法；行情 REST API 的參數名稱盡量維持官方 Market Data Web API 文件命名。

`GET /health` 會回傳目前 session lifecycle 狀態。登入正常時 HTTP status 是 `200`：

```json
{
  "ok": true,
  "message": "Fubon session is connected.",
  "status": "authenticated",
  "authenticated": true,
  "accountCount": 1,
  "lastHeartbeatAt": "2026-07-05T12:00:00.000Z",
  "lastLoginAt": "2026-07-05T11:58:00.000Z"
}
```

當 `status` 是 `reconnecting` 時，HTTP status 是 `503`，`ok` 會是 `false`，`message` 會告知目前無法正常連線，`lastError` 與 `nextReconnectAt` 會說明最近一次失敗原因與下一次重試時間。

## API 總覽

| Method | Path | 來源 SDK 功能 | 官方文件 |
| --- | --- | --- | --- |
| `GET` | `/health` | Rabang 內部健康檢查；不直接呼叫 Fubon Neo SDK | - |
| `GET` | `/snapshot/quotes/:market` | `sdk.marketdata.restClient.stock.snapshot.quotes()` | [Snapshot Quotes](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/snapshot/quotes.txt) |
| `GET` | `/snapshot/movers/:market` | `sdk.marketdata.restClient.stock.snapshot.movers()` | [Snapshot Movers](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/snapshot/movers.txt) |
| `GET` | `/snapshot/actives/:market` | `sdk.marketdata.restClient.stock.snapshot.actives()` | [Snapshot Actives](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/snapshot/actives.txt) |
| `GET` | `/historical/candles/:symbol` | `sdk.marketdata.restClient.stock.historical.candles()` | [Historical Candles](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/historical/candles.txt) |
| `GET` | `/historical/stats/:symbol` | `sdk.marketdata.restClient.stock.historical.stats()` | [Historical Stats](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/historical/stats.txt) |
| `GET` | `/intraday/tickers` | `sdk.marketdata.restClient.stock.intraday.tickers()` | [Intraday Tickers](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/intraday/tickers.txt) |
| `GET` | `/intraday/ticker/:symbol` | `sdk.marketdata.restClient.stock.intraday.ticker()` | [Intraday Ticker](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/intraday/ticker.txt) |
| `GET` | `/intraday/quote/:symbol` | `sdk.marketdata.restClient.stock.intraday.quote()` | [Intraday Quote](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/intraday/quote.txt) |
| `GET` | `/intraday/candles/:symbol` | `sdk.marketdata.restClient.stock.intraday.candles()` | [Intraday Candles](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/intraday/candles.txt) |
| `GET` | `/intraday/trades/:symbol` | `sdk.marketdata.restClient.stock.intraday.trades()` | [Intraday Trades](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/intraday/trades.txt) |
| `GET` | `/intraday/volumes/:symbol` | `sdk.marketdata.restClient.stock.intraday.volumes()` | [Intraday Volumes](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/intraday/volumes.txt) |
| `GET` | `/technical/sma/:symbol` | `sdk.marketdata.restClient.stock.technical.sma()` | [Technical SMA](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/technical/sma.txt) |
| `GET` | `/technical/rsi/:symbol` | `sdk.marketdata.restClient.stock.technical.rsi()` | [Technical RSI](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/technical/rsi.txt) |
| `GET` | `/technical/kdj/:symbol` | `sdk.marketdata.restClient.stock.technical.kdj()` | [Technical KDJ](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/technical/kdj.txt) |
| `GET` | `/technical/macd/:symbol` | `sdk.marketdata.restClient.stock.technical.macd()` | [Technical MACD](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/technical/macd.txt) |
| `GET` | `/technical/bb/:symbol` | `sdk.marketdata.restClient.stock.technical.bb()` | [Technical BBABDS](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/technical/bb.txt) |
| `GET` | `/corporate-actions/dividends` | `sdk.marketdata.restClient.stock.corporateActions.dividends()` | [除權息資料](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/corporate-actions/dividends.txt) |
| `GET` | `/corporate-actions/capital-changes` | `sdk.marketdata.restClient.stock.corporateActions.capitalChanges()` | [股本形成資料](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/corporate-actions/capital-changes.txt) |
| `GET` | `/corporate-actions/listing-applicants` | `sdk.marketdata.restClient.stock.corporateActions.listingApplicants()` | [申請上市櫃公司](https://www.fbs.com.tw/TradeAPI/docs/market-data/http-api/corporate-actions/listing-applicants.txt) |
| `WS` | `/ws` | `sdk.marketdata.webSocketClient.stock` 或 `sdk.marketdata.webSocketClient.futopt` 的 `connect()`、`subscribe()`、`unsubscribe()`、`subscriptions()`、`ping()` | [WebSocket API](https://www.fbs.com.tw/TradeAPI/docs/market-data/websocket-api/connection.txt) |
| `GET` | `/trading/accounts` | 服務啟動時 `FubonSDK.login()` 回傳的 accounts | [快速開始：登入](https://www.fbs.com.tw/TradeAPI/docs/trading/quickstart.txt) |
| `GET` | `/trading/accounting/inventories` | `sdk.accounting.inventories()` | [Node.js SDK Reference：inventories](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢庫存-inventories) |
| `GET` | `/trading/accounting/unrealized-gains-and-loses` | `sdk.accounting.unrealizedGainsAndLoses()` | [Node.js SDK Reference：unrealizedGainsAndLoses](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢未實現損益-unrealizedgainsandloses) |
| `GET` | `/trading/accounting/realized-gains-and-loses-summary` | `sdk.accounting.realizedGainsAndLosesSummary()` | [Node.js SDK Reference：realizedGainsAndLosesSummary](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢已實現損益彙總-realizedgainsandlosessummary) |
| `GET` | `/trading/accounting/realized-gains-and-loses` | `sdk.accounting.realizedGainsAndLoses()` | [Node.js SDK Reference：realizedGainsAndLoses](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢已實現損益-realizedgainsandloses) |
| `GET` | `/trading/accounting/maintenance` | `sdk.accounting.maintenance()` | [Node.js SDK Reference：maintenance](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢維持率-maintenance) |
| `GET` | `/trading/accounting/settlement` | `sdk.accounting.querySettlement()` | [Node.js SDK Reference：querySettlement](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢交割款-querysettlement) |
| `GET` | `/trading/accounting/bank-remain` | `sdk.accounting.bankRemain()` | [Node.js SDK Reference：bankRemain](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢銀行餘額-bankremain) |
| `GET` | `/trading/stock/order-results` | `sdk.stock.getOrderResults()` | [Node.js SDK Reference：getOrderResults](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢當日委託-getorderresults) |
| `GET` | `/trading/stock/order-results-detail` | `sdk.stock.getOrderResultsDetail()` | [Node.js SDK Reference：getOrderResultsDetail](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢當日委託明細-getorderresultsdetail) |
| `GET` | `/trading/stock/order-history` | `sdk.stock.orderHistory()` | [Node.js SDK Reference：orderHistory](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢歷史委託-orderhistory) |
| `GET` | `/trading/stock/filled-history` | `sdk.stock.filledHistory()` | [Node.js SDK Reference：filledHistory](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢歷史成交-filledhistory) |
| `GET` | `/trading/stock/margin-quota` | `sdk.stock.marginQuota()` | [Node.js SDK Reference：marginQuota](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢資券配額-marginquota) |
| `GET` | `/trading/stock/daytrade-and-stock-info` | `sdk.stock.daytradeAndStockInfo()` | [Node.js SDK Reference：daytradeAndStockInfo](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢現沖與股票資訊-daytradeandstockinfo) |
| `GET` | `/trading/stock/symbol-quote` | `sdk.stock.querySymbolQuote()` | [Node.js SDK Reference：querySymbolQuote](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢個股資訊-querysymbolquote) |
| `GET` | `/trading/stock/symbol-snapshot` | `sdk.stock.querySymbolSnapshot()` | [Node.js SDK Reference：querySymbolSnapshot](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢股票快照-querysymbolsnapshot) |
| `GET` | `/trading/stock/batch-order-lists` | `sdk.stock.batchOrderLists()` | [Node.js SDK Reference：batchOrderLists](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#取得批次委託列表-batchorderlists) |
| `GET` | `/trading/stock/batch-order-detail` | `sdk.stock.batchOrderDetail()` | [Node.js SDK Reference：batchOrderDetail](https://www.fbs.com.tw/TradeAPI/docs/trading/library/nodejs/SDKReference.txt#查詢批次委託明細-batchorderdetail) |

## Market Data REST API

### Snapshot

| Path | 常用 query parameters | 範例 |
| --- | --- | --- |
| `/snapshot/quotes/:market` | `type` | `/snapshot/quotes/TSE?type=COMMONSTOCK` |
| `/snapshot/movers/:market` | `direction`、`change`、`gt`、`gte`、`lt`、`lte`、`eq`、`type` | `/snapshot/movers/TSE?direction=up&change=percent&type=COMMONSTOCK` |
| `/snapshot/actives/:market` | `trade`、`type` | `/snapshot/actives/TSE?trade=value&type=COMMONSTOCK` |

### 歷史行情

| Path | 常用 query parameters | 範例 |
| --- | --- | --- |
| `/historical/candles/:symbol` | `timeframe`、`from`、`to`、`adjusted`、`fields`、`sort` | `/historical/candles/2330?timeframe=D&from=2024-01-01&to=2024-01-31&adjusted=true` |
| `/historical/stats/:symbol` | - | `/historical/stats/2330` |

### 日內行情

| Path | 常用 query parameters | 範例 |
| --- | --- | --- |
| `/intraday/tickers` | `type`、`exchange`、`market`、`isNormal`、`isAttention`、`isDisposition`、`isHalted`、`isTrial`、`offset`、`limit` | `/intraday/tickers?type=EQUITY&exchange=TWSE` |
| `/intraday/ticker/:symbol` | `type` | `/intraday/ticker/2330` |
| `/intraday/quote/:symbol` | `type` | `/intraday/quote/2330` |
| `/intraday/candles/:symbol` | `type`、`timeframe`、`sort` | `/intraday/candles/2330?timeframe=1` |
| `/intraday/trades/:symbol` | `type`、`limit`、`offset` | `/intraday/trades/2330?limit=50` |
| `/intraday/volumes/:symbol` | `type` | `/intraday/volumes/2330` |

### 技術指標

| Path | 常用 query parameters | 範例 |
| --- | --- | --- |
| `/technical/sma/:symbol` | `from`、`to`、`timeframe`、`period` | `/technical/sma/2330?from=2024-08-01&to=2024-08-10&timeframe=D&period=5` |
| `/technical/rsi/:symbol` | `from`、`to`、`timeframe`、`period` | `/technical/rsi/2330?from=2024-08-01&to=2024-08-10&timeframe=D&period=6` |
| `/technical/kdj/:symbol` | `from`、`to`、`timeframe`、`rPeriod`、`kPeriod`、`dPeriod` | `/technical/kdj/2330?from=2024-08-01&to=2024-08-10&timeframe=D&rPeriod=9&kPeriod=3&dPeriod=3` |
| `/technical/macd/:symbol` | `from`、`to`、`timeframe`、`fast`、`slow`、`signal` | `/technical/macd/2330?from=2024-08-01&to=2024-08-10&timeframe=D&fast=12&slow=26&signal=9` |
| `/technical/bb/:symbol` | `from`、`to`、`timeframe`、`period` | `/technical/bb/2330?from=2024-08-01&to=2024-08-10&timeframe=D&period=20` |

### 股務事件

| Path | 常用 query parameters | 範例 |
| --- | --- | --- |
| `/corporate-actions/capital-changes` | `start_date`、`end_date`、`sort` | `/corporate-actions/capital-changes?start_date=2025-01-01&end_date=2025-12-31` |
| `/corporate-actions/dividends` | `start_date`、`end_date` | `/corporate-actions/dividends?start_date=2025-01-01&end_date=2025-12-31` |
| `/corporate-actions/listing-applicants` | `start_date`、`end_date`、`sort` | `/corporate-actions/listing-applicants?start_date=2025-01-01&end_date=2025-12-31&sort=desc` |

## Market Data WebSocket

WebSocket client 連線到 `/ws`，同樣需要 Bearer Token。Client 傳送的 message 會轉成 Fubon Neo SDK WebSocket client 呼叫。

| Client message `event` | 來源 SDK 功能 | `data` |
| --- | --- | --- |
| `subscribe` | `sdk.marketdata.webSocketClient.stock.subscribe()` 或 `sdk.marketdata.webSocketClient.futopt.subscribe()` | `channel` 加上 `symbol` 或 `symbols`。股票支援 `intradayOddLot`；期權支援 `afterHours`。 |
| `unsubscribe` | `sdk.marketdata.webSocketClient.stock.unsubscribe()` 或 `sdk.marketdata.webSocketClient.futopt.unsubscribe()` | `id` 或 `ids` |
| `subscriptions` | `sdk.marketdata.webSocketClient.*.subscriptions()` | `{}` |
| `ping` | `sdk.marketdata.webSocketClient.*.ping()` | 可選 `state` |

若要使用期權 WebSocket client，請在 `data` 中加入 `market: "futopt"`。未提供時預設為 `stock`。

使用 `websocat` 測試：

```bash
websocat -H='Authorization: Bearer <token>' ws://localhost:3000/ws
```

連線後會先收到 `ready` message。接著可以在 `websocat` 互動模式中貼上訂閱訊息：

```json
{"event":"subscribe","data":{"channel":"trades","symbol":"2330"}}
```

一次訂閱多個 symbol：

```json
{"event":"subscribe","data":{"channel":"trades","symbols":["2330","2317"]}}
```

查詢目前 SDK subscriptions：

```json
{"event":"subscriptions","data":{}}
```

取消訂閱時使用 SDK 回傳的 subscription id：

```json
{"event":"unsubscribe","data":{"id":"<subscription-id>"}}
```

期權 WebSocket client 範例：

```json
{"event":"subscribe","data":{"market":"futopt","channel":"trades","symbol":"TXFG6"}}
```

## Trading API

Trading API 使用已登入的 FubonSDK session。預設使用登入後第一個 account；也可以用 query parameters 指定帳戶：

- `account`
- `branchNo`
- `accountType`

### 帳戶與帳務

| Path | 必要 query parameters | 可選 query parameters | 範例 |
| --- | --- | --- | --- |
| `/trading/accounts` | - | - | `/trading/accounts` |
| `/trading/accounting/unrealized-gains-and-loses` | - | `account`、`branchNo`、`accountType` | `/trading/accounting/unrealized-gains-and-loses` |
| `/trading/accounting/realized-gains-and-loses` | - | `account`、`branchNo`、`accountType` | `/trading/accounting/realized-gains-and-loses` |
| `/trading/accounting/realized-gains-and-loses-summary` | - | `account`、`branchNo`、`accountType` | `/trading/accounting/realized-gains-and-loses-summary` |
| `/trading/accounting/settlement` | `range` | `account`、`branchNo`、`accountType` | `/trading/accounting/settlement?range=3d` |
| `/trading/accounting/maintenance` | - | `account`、`branchNo`、`accountType` | `/trading/accounting/maintenance` |
| `/trading/accounting/inventories` | - | `account`、`branchNo`、`accountType` | `/trading/accounting/inventories` |
| `/trading/accounting/bank-remain` | - | `account`、`branchNo`、`accountType` | `/trading/accounting/bank-remain` |

### 股票交易查詢

| Path | 必要 query parameters | 可選 query parameters | 範例 |
| --- | --- | --- | --- |
| `/trading/stock/order-results` | - | `account`、`branchNo`、`accountType` | `/trading/stock/order-results` |
| `/trading/stock/order-results-detail` | - | `account`、`branchNo`、`accountType` | `/trading/stock/order-results-detail` |
| `/trading/stock/order-history` | `startDate` | `endDate`、`account`、`branchNo`、`accountType` | `/trading/stock/order-history?startDate=20260701&endDate=20260703` |
| `/trading/stock/filled-history` | - | `startDate`、`endDate`、`account`、`branchNo`、`accountType` | `/trading/stock/filled-history?startDate=20260701&endDate=20260703` |
| `/trading/stock/batch-order-lists` | - | `account`、`branchNo`、`accountType` | `/trading/stock/batch-order-lists` |
| `/trading/stock/batch-order-detail` | `functionType`、`date`、`batchSeqNo` | `batchBranchNo`、`batchAccount`、`account`、`branchNo`、`accountType` | `/trading/stock/batch-order-detail?functionType=0&date=20260703&batchSeqNo=<batch-seq-no>` |
| `/trading/stock/margin-quota` | `symbol` | `account`、`branchNo`、`accountType` | `/trading/stock/margin-quota?symbol=2330` |
| `/trading/stock/daytrade-and-stock-info` | `symbol` | `account`、`branchNo`、`accountType` | `/trading/stock/daytrade-and-stock-info?symbol=2330` |
| `/trading/stock/symbol-quote` | `symbol` | `marketType`、`account`、`branchNo`、`accountType` | `/trading/stock/symbol-quote?symbol=2330&marketType=Common` |
| `/trading/stock/symbol-snapshot` | - | `marketType`、`stockTypes`、`account`、`branchNo`、`accountType` | `/trading/stock/symbol-snapshot?marketType=Common&stockTypes=Stock,EtfAndEtn` |

curl 範例：

```bash
curl \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/trading/stock/order-history?startDate=20260701&endDate=20260703"
```

## 附註

Rabang 是太魯閣族語中稱呼台灣黑熊胸口白色 V 字型條文的詞彙，而 "Ana rabang kida." 則是表達「真是太好了」的意思：如果這個專案能為你省下時間就太好了。
