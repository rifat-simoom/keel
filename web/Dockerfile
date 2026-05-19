# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Vite bakes env vars into the bundle at build time — pass them as build args
ARG VITE_KEYCLOAK_URL=http://localhost:8280
ARG VITE_KEYCLOAK_REALM=keel
ARG VITE_KEYCLOAK_CLIENT_ID=keel-web
ARG VITE_API_URL=http://localhost:8001

ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_API_URL=$VITE_API_URL

# Dependency layer — only re-runs when package.json files change
COPY package.json pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY packages/types/package.json      ./packages/types/
COPY packages/api/package.json        ./packages/api/
COPY packages/validation/package.json ./packages/validation/
COPY packages/utils/package.json      ./packages/utils/
COPY web/package.json                 ./web/

RUN pnpm install --no-frozen-lockfile

# Build shared packages then the web app
COPY packages/ ./packages/
COPY web/       ./web/

RUN pnpm --filter "@keel/types" --filter "@keel/utils" \
        --filter "@keel/validation" --filter "@keel/api" build

WORKDIR /app/web
RUN node /app/node_modules/vite/bin/vite.js build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
