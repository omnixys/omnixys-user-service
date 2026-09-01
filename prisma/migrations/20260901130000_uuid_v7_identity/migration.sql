-- Phase 3: canonical identity switch (U/K)
-- User.id remains the internal Omnixys UUIDv7 (U), propagated by Authentication via the
-- provisioning events (userId). The user service never generates U and supplies no default.
-- keycloak_sub (K) is now mandated: every identity is Keycloak-backed (U != K).

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "keycloak_sub" SET NOT NULL;