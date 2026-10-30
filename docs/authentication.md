# Admin Authentication Contract

## Scope

AyaWarta has administrator authentication only. Customers and invitation guests do not create accounts or sign in.

## Chosen Approach

- Auth.js Credentials provider.
- Email and password.
- JWT session strategy.
- Prisma-backed administrator lookup and state.
- Server-side validation and password verification.

The implementation is in `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, and `src/features/auth/`. `src/features/auth/service.ts` is server-only; client forms do not import Prisma or password utilities.

## Routes

| Route | Access |
| --- | --- |
| `/admin/login` | Public; redirects authenticated administrators to `/admin`. |
| `/admin` | Authenticated active `ADMIN` or `SUPER_ADMIN`. |
| `/admin/*` | Protected by the same authorization rule. |
| `/api/auth/*` | Auth.js handlers. |

There is no registration route.

`ADMIN` and the legacy `SUPER_ADMIN` value currently have the same product permission: read the workspace and, when the editor and publish stages are implemented, edit and publish invitations. The retained enum supports existing sessions and records; it does not create a separate approval tier or distinct UI. No role-removal migration is part of the current work.

## Credential Flow

1. Parse credentials using a server-side validation schema.
2. Normalize email with trimming and lower-casing.
3. Load the user through Prisma.
4. Return the same public failure for unknown, inactive, locked, or invalid-password cases.
5. Verify password against `passwordHash` using the selected safe hashing library.
6. Increment failure state on a failed known-user attempt.
7. Apply temporary lockout at the configured threshold.
8. Clear failure state after successful verification.
9. Return minimal identity data to Auth.js.
10. Add user ID and role to JWT/session callbacks.

## Password Rules

- Plaintext passwords appear only transiently during bootstrap or login.
- Never log password input or password hashes.
- Bootstrap reads `ADMIN_PASSWORD` from the environment.
- Bootstrap requires at least eight characters and at most 72 UTF-8 bytes for bcrypt.
- Hashing uses a maintained algorithm/library that works reliably on Vercel.
- Password comparison must resist timing leaks through the library API.
- No plaintext fallback is permitted.

## Lockout Contract

`src/features/auth/types.ts` defines five maximum consecutive failures and a 15-minute lock duration. `recordFailedLoginAttempt` uses database increments; an expired lock starts a new failure sequence. Tests use these constants rather than duplicate numbers.

Public errors remain generic. The successful-login path resets both `failedLoginCount` and `lockedUntil`.

## Session Contract

The session exposes only information required by the admin UI:

- user ID;
- name;
- email;
- role.

It does not expose `passwordHash`, lockout counters, or secrets.

## Authorization

Authentication proves identity; authorization checks an active admin role. A valid session without an allowed role must not access admin pages or admin actions.

`src/proxy.ts` matches `/admin/:path*` and `src/auth.config.ts` handles login versus protected-route redirects. Protected server pages also call `requireAdminSession`, which reloads the current user and rejects deleted, inactive, locked, or role-revoked accounts. Every future admin mutation must perform authorization on the server. Hiding navigation in the UI is not sufficient.

The authored `src/features/admin/draft-service.ts` calls `requireAdminSession` for draft reads, creation, saves, publication history, and publishability preflight. It returns typed results and domain errors rather than exposing Prisma rows. These server-only functions are not an exposed editor route, preview route, or publish action. Their tables are in an authored migration that has not been applied to production Neon; authorization alone does not make them available for production use.

## Bootstrap

The admin bootstrap script:

1. validates `ADMIN_EMAIL` and `ADMIN_PASSWORD`;
2. normalizes the email;
3. hashes the password;
4. upserts one administrator by email;
5. never prints the password or hash;
6. is safe to rerun;
7. reports only the normalized email and outcome.

The current CLI creates or updates a `SUPER_ADMIN` account and resets `isActive`, failed-login count, and lock state while replacing its password hash. Treat rerunning it as an administrator credential change, even when the email already exists.

The owner enters bootstrap values directly in `.env.local`, not in chat or committed files.

For a local password change, set a new `ADMIN_PASSWORD` in the ignored environment file and rerun `pnpm admin:bootstrap`; the same email is updated and the lockout is cleared. `pnpm prisma:seed` also updates that administrator when the two admin variables are set. Do not run the bootstrap against Neon without a separately approved production procedure. See [deployment operations](deployment-aiven-vercel.md).

## Deferred Features

- Public registration.
- Email verification.
- Password reset email.
- OAuth.
- Multi-factor authentication.
- Full admin user management UI.

Adding any deferred feature requires a separate reviewed design.

## Test Matrix

- malformed email;
- missing password;
- unknown email;
- wrong password;
- inactive user;
- locked user;
- failure count increment;
- lock threshold reached;
- successful login resets failure state;
- valid admin session;
- unauthorized role rejection;
- unauthenticated redirect;
- authenticated admin redirected away from login;
- logout invalidates access;
- bootstrap idempotency.

## Review Checklist

- [ ] Credentials logic is server-only.
- [ ] Secrets are absent from client bundles and logs.
- [ ] Generic public failures prevent email enumeration.
- [ ] Every admin route and server action checks authorization.
- [ ] Session augmentation is typed.
- [ ] Bootstrap output is safe.
- [ ] Tests cover the matrix above.
