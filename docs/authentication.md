# Admin Authentication Contract

## Scope

AyaWarta has administrator authentication only. Customers and invitation guests do not create accounts or sign in.

## Chosen Approach

- Auth.js Credentials provider.
- Email and password.
- JWT session strategy.
- Prisma-backed administrator lookup and state.
- Server-side validation and password verification.

## Routes

| Route | Access |
| --- | --- |
| `/admin/login` | Public; redirects authenticated administrators to `/admin`. |
| `/admin` | Authenticated active `ADMIN` or `SUPER_ADMIN`. |
| `/admin/*` | Protected by the same authorization rule. |
| `/api/auth/*` | Auth.js handlers. |

There is no registration route.

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
- Hashing uses a maintained algorithm/library that works reliably on Vercel.
- Password comparison must resist timing leaks through the library API.
- No plaintext fallback is permitted.

## Lockout Contract

The implementation must define constants for:

- maximum consecutive failures;
- lock duration.

Tests must use these constants rather than hard-coded duplicate values. Public errors remain generic. The successful-login path resets both `failedLoginCount` and `lockedUntil`.

## Session Contract

The session exposes only information required by the admin UI:

- user ID;
- name;
- email;
- role.

It does not expose `passwordHash`, lockout counters, or secrets.

## Authorization

Authentication proves identity; authorization checks an active admin role. A valid session without an allowed role must not access admin pages or admin actions.

Every future admin mutation must perform authorization on the server. Hiding navigation in the UI is not sufficient.

## Bootstrap

The admin bootstrap script:

1. validates `ADMIN_EMAIL` and `ADMIN_PASSWORD`;
2. normalizes the email;
3. hashes the password;
4. upserts one administrator by email;
5. never prints the password or hash;
6. is safe to rerun;
7. reports only the normalized email and outcome.

The owner enters bootstrap values directly in `.env.local`, not in chat or committed files.

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

