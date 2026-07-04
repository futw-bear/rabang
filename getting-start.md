# 使用指南

為了保障您的隱私，富台熊熊 APP 需要自定義伺服器才能夠正常使用完整功能。

## 事前準備：帳戶

您需要根據富邦證券的 [事前準備](https://www.fbs.com.tw/TradeAPI/docs/trading/prepare/) 頁面的步驟，並完成「API 使用風險暨聲明書簽署」步驟

接著，在 [金鑰申請及管理](https://www.fbs.com.tw/TradeAPI/docs/key/) 中登入您的帳戶，並且按照頁面上的步驟取得 API 金鑰；權限的部份僅需要「行情」「證券業務」兩項。

此時，您應該已經備妥以下資訊：

1. 身份證字號
2. 登入密碼
3. 憑證
4. API 金鑰

## 事前準備：軟體安裝

- 安裝 [Docker](https://www.docker.com/)。
- 安裝 [Ngrok](https://ngrok.com/docs)。

## 建立伺服器

利用以下指令取得公共伺服器位址：
```
ngrok http 3000
```

利用以下指令啟動伺服器：
```
docker run --rm -it \
  -p 3000:3000 \
  -e FUBON_USER={您的身份證字號} \
  -e FUBON_PASSWORD={您的登入密碼} \
  -v ./{您的憑證路徑}:/certs/fubon.p12:ro \
  ghcr.io/futw-bear/rabang
```

此時，就可以在富台熊熊 APP 中輸入第一個指令獲取到的公共伺服器位址，並且輸入第二個指令自動幫您生成的權杖（Token）數據。
