# ──────────────────────────────────────────────────────────────────────────────
# Build: собираем статику Vite-SPA
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build        # tsc --noEmit (strict) + vite build → /app/dist

# ──────────────────────────────────────────────────────────────────────────────
# Runtime: отдаём dist через nginx (SPA-fallback для react-router)
# ──────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
