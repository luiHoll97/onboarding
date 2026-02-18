# Driver Onboarding — Mini Monorepo

TypeScript monorepo with **React** (frontend), **GraphQL** (gateway), **services** (backend), and **protobuf** (shared contract). **Proto-first:** types flow from proto → services → GQL (with mapping in resolvers) → frontend.

## Structure

| Package | Role |
|--------|------|
| `packages/proto` | `.proto` definitions and generated TypeScript (Buf + `protoc-gen-es`) |
| `packages/services` | RPC-style service API backed by SQLite (`driver_onboarding.sqlite`): driver RPC + auth/session RPC |
| `packages/gql` | GraphQL schema mirroring proto; query/mutation resolvers call typed RPC client |
| `packages/frontend` | Vite + React + React Router: Dashboard, editable Driver detail with audit trail, Stats pie chart |

## Setup

```bash
yarn install
yarn codegen
```

**Codegen order:** proto → gql (resolver types) → frontend (client types).

- **Proto:** generates TS from `packages/proto/proto/**/*.proto` into `packages/proto/generated/`.
- **GQL:** generates resolver types into `packages/gql/src/generated/graphql.ts`, then creates one resolver stub file per schema type in `packages/gql/src/resolvers/` (only if the file doesn’t exist, so your field resolution is kept). Implement each type in its file; they’re merged in `resolvers/index.ts`.
- **Frontend:** generates typed documents/hooks from the same schema into `packages/frontend/src/generated/`.

## Run

From repo root (three terminals, or use a process manager):

```bash
yarn dev:services   # http://localhost:4001
yarn dev:gql       # http://localhost:4000/graphql
yarn dev:frontend  # http://localhost:3000
```

Then open **http://localhost:3000**:
- Login page is the entry point.
- Default seeded admin credentials: `admin@driver.app` / `admin123`.
- If a valid session token exists in local storage on refresh, app opens dashboard directly.
- Dashboard: filterable driver list.
- Driver detail: editable profile with compliance fields (NIN, right-to-work code, ID checks, interview/induction dates, licence details, address/contact) and audit trail.
- Stats: status breakdown cards + pie chart, with filter inputs routed through GraphQL stats args.

Or run all at once: `yarn dev`

## Scripts (root)

- `yarn codegen` — run all codegen (proto, gql, frontend).
- `yarn build` — build all packages (proto codegen must have been run first).
- `yarn dev` — run all dev servers.
- `yarn dev:frontend` / `dev:gql` / `dev:services` — run a single dev server.

## Tech

- **Proto:** Buf, `@bufbuild/protoc-gen-es`, `@bufbuild/protobuf`.
- **GQL:** GraphQL Yoga, `@graphql-codegen` (typescript + typescript-resolvers).
- **Frontend:** Vite, React, Apollo Client, `@graphql-codegen` (client preset).
- **Services:** Express RPC endpoint, typed with `@driver-onboarding/proto`.

Not stupid — this gives you a single repo with a clear contract (proto), type-safe backend (services + GQL using proto), and a type-safe frontend (GraphQL codegen).
