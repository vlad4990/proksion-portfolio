# syntax=docker/dockerfile:1.7
# Build context = repo root (so we can COPY both front/ and design-system/).

FROM node:22-alpine AS deps
WORKDIR /app
COPY front/package.json front/package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY front/package.json front/package-lock.json* ./
RUN npm ci --omit=dev \
 && rm -rf node_modules/@img/sharp-libvips-linux-[!m]* node_modules/@img/sharp-linux-[!m]*

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY front/ ./
# design-system is the single source of truth for tokens, fonts, assets.
COPY design-system/ /design-system/
# Symlinks in public/ point at ../../design-system/* — fine in dev, dead in
# the container because Docker preserves symlinks without their target.
# Replace them with real copies so the static handler can serve files.
RUN rm -f public/fonts public/assets \
 && cp -r /design-system/fonts public/fonts \
 && cp -r /design-system/assets public/assets
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
