# syntax=docker/dockerfile:1
FROM node:22-alpine AS dependencies
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

# Bind only source/config files in Compose; Linux dependencies stay in the image.
FROM dependencies AS development
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dependencies AS build
COPY --chown=node:node . .
# Vite settings are compiled into the bundle, not read by Nginx at runtime.
ENV VITE_API_BASE_URL=/api/v1 \
    VITE_ENABLE_MOCK_AUTH=false
RUN npm test && npm run build

FROM ghcr.io/nginx/nginx-unprivileged:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://host.docker.internal:3000 \
    NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
