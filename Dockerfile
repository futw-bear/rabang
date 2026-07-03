FROM oven/bun:1.3.14

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV FUBON_CERT=/certs/fubon.p12

COPY package.json bun.lock fubon-neo-2.2.8.tgz ./
RUN bun install --frozen-lockfile

COPY index.ts tsconfig.json ./
COPY src ./src

RUN mkdir -p /certs

EXPOSE 3000

CMD ["bun", "index.ts"]
