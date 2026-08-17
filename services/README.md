# Workmate.IQ platform services

True microservices behind `api-gateway` (port 4000), implementing the
**registration → onboarding** vertical slice from the architecture spec.
Each service is independently deployable: its own `package.json`, own
MongoDB database (same Atlas cluster, separate DB name), own `.env`.

| Service | Port | Owns |
|---|---|---|
| api-gateway | 4000 | Routes `/api/v1/*` to the right service. No DB. |
| auth-service | 4001 | `users`, `roles`, `refresh_tokens`. Login/refresh/logout/me. |
| form-service | 4002 | `form_definitions`, `form_versions`. Registration + onboarding schemas. |
| registration-service | 4003 | `registrations`. Public registration submit, self-hosted CAPTCHA. |
| onboarding-service | 4004 | `onboarding_invitations`, `onboarding_sessions`, `onboarding_submissions`. Token flow, autosave, local-disk file upload, submit. |
| communication-service | 4005 | `templates`, `communications`. Mock email/WhatsApp send + status tracking. |

## First-time setup

```bash
cd services
for s in auth-service form-service registration-service onboarding-service communication-service api-gateway; do
  (cd $s && npm install)
done

(cd auth-service && npm run seed)          # creates SUPER_ADMIN/REVIEWER roles + admin@workmateiq.local
(cd form-service && npm run seed)          # publishes registration + onboarding forms for all 3 types
(cd communication-service && npm run seed) # publishes ONBOARDING_LINK email/WhatsApp templates
```

## Running

Start each service in its own terminal (or background process):

```bash
cd services/auth-service && npm run dev
cd services/form-service && npm run dev
cd services/registration-service && npm run dev
cd services/onboarding-service && npm run dev
cd services/communication-service && npm run dev
cd services/api-gateway && npm run dev
```

The React client (`client/`) talks only to `http://localhost:4000` (the
gateway) via `VITE_GATEWAY_URL` in `client/.env`.

## What's implemented

- Login (JWT access token, rotated HttpOnly refresh cookie) → `/platform/login`
- Registration type selection → `/platform/register`
- Dynamic registration form (schema-driven, server-revalidated, self-hosted CAPTCHA, consent) → `/platform/register/:type`
- Registration triggers a real internal call chain: registration-service → onboarding-service (token + invitation) → communication-service (mock email/WhatsApp, masked destination, real status)
- Onboarding token flow → `/platform/onboarding/:type/:token`: welcome screen, dynamic onboarding form, debounced autosave, local-disk file upload (presign/complete contract), server-side re-validation, immutable submission on submit
- Service-to-service auth: every internal call carries `X-Service-Name` / `X-Service-API-Key` / `X-Request-ID` / `X-Correlation-ID`, verified against a per-service allowlist (`INCOMING_SERVICE_KEYS` / `SERVICE_PERMISSIONS` in each service's `.env`)

## What's NOT implemented (out of scope for this slice)

Admin dashboard, client list/detail, approve/reject/request-changes review
flow, enquiries, communication center UI, form builder UI, audit log,
real S3 (uses local disk) and real SQS (uses direct/mock dispatch — both
explicitly sanctioned by the spec for local dev). These need the same
service-oriented approach, layered on top of what's here.
