# Deploying the microservices platform to Render

You already have `ai-interview` on Render auto-deploying `server/` from this
repo's `main` branch. `render.yaml` at the repo root is a **Blueprint** that
provisions the 9 new services (`services/*`) the same way, in one pass.

## 1. Create the Blueprint

1. Render dashboard → **New** → **Blueprint**.
2. Connect the `Agrima6/ai-interview` repo (same one your existing `ai-interview`
   service already uses).
3. Render reads `render.yaml` and lists all 9 services it's about to create.
4. It will prompt you for every variable marked `sync: false` in the file -
   these are the secrets. Fill them in as follows.

### Per-service secrets to enter

For each `MONGODB_URL`: use the same Atlas cluster you already have, one
database name per service (matches what's in your local `.env` files right
now, e.g. `workmateiq_auth`, `workmateiq_form`, etc.) - just copy the pattern
from each service's local `.env`.

`ACCESS_TOKEN_SECRET` must be the **same value** across auth-service,
onboarding-service, client-service, dashboard-service, and enquiry-service -
copy it from your local `services/auth-service/.env`.

The `*_API_KEY` and `INCOMING_SERVICE_KEYS` values: copy them from your local
`.env` files too - they're just shared secrets between your own services, not
external credentials, so reusing the same values is fine.

`EMAIL_USER` / `EMAIL_APP_PASSWORD` on communication-service: only needed if
you're switching `EMAIL_MODE` to `direct`. Leave `EMAIL_MODE=mock` (already
the default in the blueprint) until you're ready to send real email.

## 2. First deploy will fail to call each other - that's expected

The `*_SERVICE_URL` variables (e.g. `FORM_SERVICE_URL` on
registration-service) can't be known until Render assigns each service its
URL. Leave them blank on first deploy.

Once deployed, each service's page shows its URL, e.g.
`https://form-service-xxxx.onrender.com`. Collect all 9 URLs.

## 3. Wire the URLs and redeploy

Go back into each service's **Environment** tab and paste in the real URLs
for whichever `*_SERVICE_URL` variables it has (see `render.yaml` for which
service needs which). Then trigger a manual redeploy on each one you changed.

Reference for which service calls which:

```
api-gateway        -> all 8 others (routes every /api/v1/* prefix)
registration-service -> form-service, onboarding-service, communication-service
onboarding-service  -> form-service, client-service
dashboard-service   -> onboarding-service, client-service, enquiry-service
```

## 4. Point the frontend at the gateway

In your Vercel project (the client), add/update an environment variable:

```
VITE_GATEWAY_URL=https://api-gateway-xxxx.onrender.com
```

Redeploy the client.

## 5. Seed the databases

Render's free web services don't give you a persistent shell, so run the
seed scripts from your machine, pointed at the **production** MongoDB URIs
(temporarily edit the `.env` files locally to the prod DB, run the script,
then revert):

```bash
cd services/auth-service && npm run seed
cd services/form-service && npm run seed
cd services/communication-service && npm run seed
```

## Heads up on the free tier

Render's free web services spin down after inactivity and take 50+ seconds
to cold-start. With 9 services calling each other, a cold request (e.g. a
new registration, which touches registration-service -> onboarding-service ->
form-service -> communication-service) can compound into a very slow first
request after idle time, or time out. If that's a problem in practice, the
fix is upgrading the most-called services (form-service, onboarding-service)
off the free tier, or consolidating some services - not something to solve
preemptively, worth watching once it's live.
