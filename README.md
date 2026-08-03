# Omnixys User Service

The User service owns user profiles, personal information, customer and employee extensions, contacts, phone numbers, and interest catalog reads. Authentication credentials and token policy remain owned by `authentication-service` and `@omnixys/security-ts`.

## Runtime architecture

- GraphQL exposes profile reads and authenticated profile mutations.
- Kafka consumes verified identity lifecycle events and creates or removes local user aggregates.
- PostgreSQL is accessed through Prisma.
- Valkey stores short-lived registration state owned by the authentication workflow.
- `@omnixys/context-ts` is the canonical source for request, actor, tenant, correlation, and trace metadata.
- `@omnixys/logger-ts` and `@omnixys/observability-ts` enrich logs and spans from that context.

Administrative profile reads and mutations require the `ADMIN` business role. Self-service mutations always derive the target user ID from the verified principal; client-supplied ownership IDs are not trusted.

## Configuration

Copy `.env.example` to `.env`. Production requires valid database, Valkey, Keycloak, encryption, and cookie secrets. Optional external health URLs are checked only when configured.

Important settings include `DATABASE_URL`, `VALKEY_URL`, `VALKEY_PASSWORD`, `KAFKA_BROKER`, `KC_URL`, `KC_REALM`, `ENCRYPTION_KEY`, `COOKIE_SECRET`, `TEMPO_URI`, `PORT`, and `SERVICE`.

## Health and lifecycle

- `GET /health/liveness` reports process liveness.
- `GET /health/readiness` checks PostgreSQL, Valkey, Kafka lifecycle state, and configured external dependencies.
- Nest shutdown hooks close Prisma, Kafka, Valkey, logger batches, and observability exporters.

## Development

```bash
pnpm install
pnpm run generate
pnpm run build
pnpm run lint
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

The E2E resolver suite verifies the public resolver contract, authorization branches, mapping, and nested-field resolution. Unit and integration suites verify idempotent lifecycle handling and canonical GraphQL error metadata.
