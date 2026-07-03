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

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
