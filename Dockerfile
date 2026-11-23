FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci
COPY . .
ENV DATABASE_URL=file:/tmp/build.db
RUN npx prisma generate && npm run build

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]