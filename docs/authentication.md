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
| `/admin/invitations`, `/admin/invitations/new`, `/admin/invitations/[id]/edit`, `/admin/invitations/[id]/preview` | Protected by the same authorization rule; edit and preview IDs identify drafts. |
| `/admin/api/drafts/[id]/media` | Admin-only Node.js image upload route; also requires the default-disabled A5 target gate, same request origin, and a saved new-draft version. |
| Other `/admin/*` routes | Protected by the same authorization rule. |
| `/api/auth/*` | Auth.js handlers. |

There is no registration route.

`ADMIN` and the legacy `SUPER_ADMIN` value have the same product permission: read the workspace, create and edit drafts, and explicitly publish invitations. The retained enum supports existing sessions and records; it does not create a separate approval tier or distinct UI. No role-removal migration is part of the current work.

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

`src/app/admin/actions.ts` exposes create, open, save, read-only publication review, and explicit publish operations. The server-only draft and publish services recheck `requireAdminSession` for every read and mutation and return typed results rather than Prisma rows. The private preview reloads only a saved draft under the same authorization, with dynamic rendering and guest submission disabled. Publishing requires another authorization check, validated version tokens, and an exact slug confirmation; saving or previewing never publishes. The draft tables and four version-1 publication baselines were verified on Neon on 2026-10-30. No invitation content was changed by the baseline operation.

The A5 image upload route independently rechecks the current admin, rejects a mismatched request origin, and caps the streamed request body before decoding. It also requires a saved new-draft version and an explicit server-side feature gate bound to the approved Cloudinary account. Recovery and first publication recheck the admin and A5 gate. A client-supplied image URL or media ID does not grant access to an asset. The A5 database migration was applied to the approved Neon target on 2026-10-31, but the feature switches remain off by default; no upload or first publication was activated by that migration. A4 admin operations remain available without querying the A5 table while the gate is off. First publication is limited to a new Classic Rose draft with verified draft-owned images and no new music upload.

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
- bootstrap idempotency;
- unauthenticated create/save actions and direct edit/preview requests are rejected;
- active `ADMIN` and legacy `SUPER_ADMIN` can access the same draft operations;
- draft preview never mounts a guest submission adapter.
- A5 upload and recovery reject inactive/unauthenticated admins, disabled feature gates, and wrong draft/version; the upload route also rejects a mismatched request origin.

## Review Checklist

- [ ] Credentials logic is server-only.
- [ ] Secrets are absent from client bundles and logs.
- [ ] Generic public failures prevent email enumeration.
- [ ] Every admin route and server action checks authorization.
- [ ] Session augmentation is typed.
- [ ] Bootstrap output is safe.
- [ ] Tests cover the matrix above.
