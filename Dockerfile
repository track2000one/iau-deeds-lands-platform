# Deterministic Vite build without Railway Railpack's generated frontend image.
FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .

# The frontend API base URL must be present at build time for Vite.
# Do not pass secrets here: VITE_* values are embedded in browser bundles.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
ENV PORT=8080
EXPOSE 8080
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
