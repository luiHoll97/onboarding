# Services

## Local Postgres Setup

This package now includes a local Postgres stack and SQL migrations.

### Start Postgres

```bash
yarn workspace @driver-onboarding/services run db:pg:up
```

### Run migrations

```bash
yarn workspace @driver-onboarding/services run db:pg:migrate
```

By default this uses:

`postgres://driver_onboarding:driver_onboarding@localhost:5432/driver_onboarding`

You can override with:

```bash
DATABASE_URL=postgres://... yarn workspace @driver-onboarding/services run db:pg:migrate
```

### View logs

```bash
yarn workspace @driver-onboarding/services run db:pg:logs
```

### Stop Postgres

```bash
yarn workspace @driver-onboarding/services run db:pg:down
```

## Files

- `docker-compose.postgres.yml`: local Postgres container
- `migrations/001_init.sql`: base schema
- `scripts/pg-migrate.sh`: migration runner via `psql`
