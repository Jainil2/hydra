Hydra Playground
=================

This is a small demo playground to test Ory Hydra OAuth2 / OIDC flows with a Node.js + Express app.

Quick start (macOS / Linux):

1. Copy `.env.example` to `.env` and set `HYDRA_ADMIN_URL`, `HYDRA_PUBLIC_URL`, and `DATABASE_URL` as needed.
2. Start Docker Compose to run Postgres and Hydra:

```bash
docker-compose up -d
```

3. Install dependencies and run the app:
Environment variables used by this project (add to `.env`):

- `PORT` - port for Express app (default 3000)
- `HYDRA_ADMIN_URL` - Hydra admin API URL (default `http://localhost:4445`)
- `HYDRA_PUBLIC_URL` - Hydra public URL (default `http://localhost:4444`)
- `DATABASE_URL` - Postgres DSN
- `OAUTH_GOOGLE_CLIENT_ID` - (optional) Google OIDC client id for federation demo
- `OAUTH_GOOGLE_CLIENT_SECRET` - (optional) Google OIDC client secret

PKCE flow notes:
- Use the Flow Runner UI (`/flows`) to generate a PKCE `verifier`/`challenge`. The UI will open the Hydra authorize URL with the `code_challenge`.
- After login/consent, copy the `code` from the callback and use the "Exchange PKCE" button in the Flow Runner to exchange the code using the stored `verifier`.

Quick verification steps:

1. Start Docker Compose:

```bash
docker-compose up -d
```

2. Install deps and run migrations:

```bash
npm install
npm run migrate
npm run dev
```

3. Create demo client (example):

```bash
curl -X POST http://localhost:4445/clients -H 'Content-Type: application/json' -d '{"client_id":"demo-client","client_secret":"secret","grant_types":["authorization_code","refresh_token","client_credentials"],"response_types":["code"],"redirect_uris":["http://localhost:3000/result","http://localhost:3000/callback"]}'
```

4. Seed demo user:

```bash
curl -X POST http://localhost:3000/auth/seed-user -H 'Content-Type: application/json' -d '{"username":"demo-user","password":"password"}'
```

5. Open the Flow Runner UI: `http://localhost:3000/flows` and try Authorization Code, PKCE, client credentials, introspect and revoke flows.



```bash
npm install
npm run dev
```

4. Run DB migrations (requires `knex` installed globally or use npx):

```bash
npx knex migrate:latest --knexfile ./knexfile.js
```

5. Create a demo OAuth2 client (example using admin API):

```bash
curl -X POST http://localhost:4445/clients -H 'Content-Type: application/json' -d '{"client_id":"demo-client","client_secret":"secret","grant_types":["authorization_code","refresh_token","client_credentials"],"response_types":["code"],"redirect_uris":["http://localhost:3000/result"]}'
```

4. Use the UI at `http://localhost:3000` and follow the flows.

Notes:
- This is a demo. Do not use these secrets in production.
- The Node app acts as the login/consent provider for Hydra and demonstrates token exchange, introspection, and verification.
