# Frontend Docker setup

## Run frontend, backend and MySQL together

The backend repository now owns the shared development Compose setup. From that checkout, run `npm run stack:up`. It clones this frontend into `../frontend` if missing, preserves existing frontend work, applies pending database migrations, and starts both applications with hot reload. Open <http://localhost:5173>.

Configure this workflow in **backend/.env**. It defaults to real API mode; use `FRONTEND_MOCK_AUTH=true` there for isolated UI development. Authentication APIs still need implementation for real login. Stop with `npm run stack:down` from backend; database data persists. See `backend/docs/DOCKER.md` in that checkout for the full guide.

The commands below are for running the frontend separately. Avoid starting both setups on the same host ports.

Run commands from the **frontend repository root**, not `src/`. Docker needs `package.json`, the lockfile, Vite configuration and `index.html` as well as the Vue source. Requires Docker Desktop (or Docker Engine with Compose).

## Production build

```sh
docker compose up --build -d frontend
```

Open <http://localhost:8080>. This builds with Node 22, runs the frontend tests, then serves only `dist/` using unprivileged Nginx on container port 8080. Source files, dependencies and local `.env` files are not in the final image. The production build excludes mock authentication and developer pages.

Refreshing URLs such as `/attendance/history` serves the Vue app; Vue's route guard then decides whether the user can enter. `/api/*` is proxied to the backend and never falls back to the frontend HTML. Hashed `/assets/*` files are cached; the HTML is revalidated. `/healthz` reports that Nginx is serving, not that the backend/database is healthy.

## Development with hot reload

```sh
docker compose up --build frontend-dev
```

Open <http://localhost:5173/login>. Select a role using the development toolbar, then open `/dev/example` or `/style-guide`. **This service defaults to mock auth**, so members can work without a backend. Mock mode blocks live API calls.

Edit `src/` on your host; changes are reflected by Vite. The source, public assets, HTML entry point and Vite config are bind-mounted read-only from the container's perspective. Dependencies remain inside the image, avoiding macOS/Windows vs Linux native-module conflicts. Rebuild after changing `package.json` or `package-lock.json`; no dependency volume needs clearing. If you add another root configuration file that needs live reload, add its bind mount centrally.

Compose automatically enables a profile when its service is explicitly targeted, so this command starts only `frontend-dev`. Production and development can run together because they use different ports.

## Connect to the backend

Both services keep browser requests on `/api/v1` and proxy them to `http://host.docker.internal:3000` by default. The backend and MySQL are **not** started by this Compose file; run them separately from the backend repository.

For live development (authentication endpoints must be implemented):

```sh
FRONTEND_MOCK_AUTH=false docker compose up --build frontend-dev
```

The Nest backend must listen on an address reachable from Docker. Its default `HOST=127.0.0.1` may be unreachable from a container; if needed set backend `HOST=0.0.0.0` and restart it. That widens the backend's listen address, so use the appropriate local firewall/network settings. No backend configuration is changed by this setup.

The shared backend Compose setup already connects both applications on one network. When using this standalone frontend Compose file instead, keep its host proxy target to reach the backend's published port. Separate Compose projects do not automatically share service-name DNS.

`FRONTEND_API_UPSTREAM` must be an HTTP(S) origin with no path or trailing slash (for example `http://host.docker.internal:3000`). `/api/v1` is preserved by the proxy. Backend cookies should omit `Domain` so they apply to the browser-facing host. Cookie security and trusted proxy configuration must be agreed with the auth developer. Deployed location check-in and secure cookies require HTTPS; put this HTTP container behind your deployment's TLS ingress and configure forwarded headers/trust appropriately.

If the backend is unavailable, the public frontend still loads, while API requests fail with a gateway error and protected pages show the shared session-unavailable state. This does not mean the frontend image failed.

## Configuration

Set these in the shell or the frontend root `.env` read by Compose. Compose does not automatically load `.env.local`. The Docker build excludes all `.env*` files; no local settings or credentials are baked into the image.

| Variable                | Default                            | Purpose                                                 |
| ----------------------- | ---------------------------------- | ------------------------------------------------------- |
| `FRONTEND_PORT`         | `8080`                             | Host port for the production container                  |
| `FRONTEND_DEV_PORT`     | `5173`                             | Host port for Vite in Docker                            |
| `FRONTEND_API_UPSTREAM` | `http://host.docker.internal:3000` | API destination from inside containers                  |
| `FRONTEND_MOCK_AUTH`    | `true`                             | Development service only; set `false` for live API work |

If host Vite already uses 5173:

```sh
FRONTEND_DEV_PORT=5176 docker compose up --build frontend-dev
```

The production API base is compiled as `/api/v1`. Setting `VITE_*` variables on the running Nginx container does not change its bundle. Change `FRONTEND_API_UPSTREAM` to route to a different backend and recreate the container.

## Inspect and stop

```sh
docker compose ps
docker compose logs -f frontend
docker compose logs -f frontend-dev
docker compose stop frontend frontend-dev
# Remove this frontend project's containers/network; no database volumes are managed here.
docker compose --profile development down
```

Base images use maintained Node 22 and Nginx stable Alpine tags. Refresh them with `docker compose build --pull`; pin reviewed image digests when establishing a reproducible deployment pipeline.

## Verification

Both images were built and run locally. Checks covered the frontend tests inside Linux, container health, non-root Nginx, Vue route refreshes, static asset caching/404s, development rendering and host-source hot reload. A disposable fake API verified proxy paths, query strings, JSON bodies, cookies, CSRF headers and API error responses. This verifies container/proxy wiring; live authentication and attendance integration still depend on their backend features.

References: [NGINX unprivileged image](https://github.com/nginx/docker-nginx-unprivileged), [Compose service profiles](https://docs.docker.com/compose/how-tos/profiles/).
