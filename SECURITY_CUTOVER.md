# Security hard-cutover runbook

This release removes all legacy Supabase Auth, signup, invitation, join, and magic-link compatibility. Treat the API, web client, and required mobile release as one coordinated deployment.

## 1. Freeze, back up, and preflight

1. Pause writes and create a restorable PostgreSQL backup.
2. Restore that backup into an isolated staging database.
3. In `api`, point `DATABASE_URL` at the restored copy and run `pnpm security:preflight`.
4. Stop if the report contains any null tenant owner, cross-community reference, invalid password hash, duplicate community-scoped client ID, or ownership blocker. Resolve mappings explicitly; do not invent tenant ownership.
5. Record the reported legacy invitation count for the migration record.

## 2. Dry-run and verification

1. Apply migrations to the database copy with `pnpm prisma migrate deploy`.
2. Set `TEST_DATABASE_URL` to a separate migrated integration database and run `pnpm test:integration`.
3. Run `pnpm check` in `api` and `web`, plus `pnpm check` in `mobile`.
4. Run `pnpm audit --prod --audit-level high` in all three projects. Do not proceed with any high or critical result.
5. Generate and review clients with `pnpm openapi:generate` in `api`.

## 3. Credential and session response

The repository previously contained bearer tokens in tracked Android logcat captures and a local command permission. Those files and the command were removed from the working tree, but Git history still contains them.

Before production cutover:

1. Revoke all Supabase Auth sessions and remove/disable every Supabase Auth client configuration.
2. Rotate any credential represented in those captures, plus any related service credential if its exposure cannot be ruled out.
3. Keep only the server-side Supabase Storage service credential. Rotate it if it appeared in logs or history.
4. Rotate `JWT_SECRET` for the new API deployment and store it only in the deployment secret manager.
5. Before reopening traffic, perform the selected coordinated history rewrite across every ref. Remove all historical `logcat*.txt` and `android-logcat*.txt` paths, force-push the rewritten refs, invalidate CI caches, and require every collaborator and build agent to re-clone. Preserve any legally required evidence outside Git before rewriting it.

The security migration revokes all existing custom refresh tokens. Every user must authenticate again.

## 4. Production deployment order

1. Re-run backup and preflight against the frozen production database.
2. Apply the database migration.
3. Deploy the API with exact CORS origins and explicit trusted proxy ranges.
4. Deploy the web client and verify that access tokens remain in memory and refresh uses the protected cookie/CSRF flow.
5. Publish the mobile build as a required upgrade. Verify Keychain/Keystore token storage on physical iOS and Android devices.
6. Remove the old Supabase Auth environment variables and callback URLs from every client and hosting environment.
7. Verify the seeded super-admin temporary credential, forced first-password change, community member administration, platform account administration, logout revocation, and refresh-token reuse response.

## 5. Acceptance gates

- Removed routes return 404: registration, email verification, invitation, join, callback, and magic-link routes.
- A temporary password returns only a password-change challenge.
- A user from community A receives 403/404 for every community B read, write, sync, upload, audit, error-review, and cross-entity reference attempt.
- Concurrent idempotent requests execute once, and repeated sync operation IDs do not repeat mutations.
- The final active community administrator and final active platform super-admin cannot be removed.
- Upload spoofing is rejected and failed database writes do not leave objects behind.
- API, web, and mobile audits report zero high/critical findings.
