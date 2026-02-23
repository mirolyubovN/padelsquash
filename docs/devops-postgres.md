# DevOps / PostgreSQL Runbook (Local Development)

## Purpose

This document describes how the project database is provisioned and operated locally using Docker Desktop, how Prisma migrations/seeding are applied, and how to troubleshoot the common Windows + Docker + Prisma connectivity issues we hit during setup.

This app uses:

- PostgreSQL (local container in development)
- Prisma ORM (schema, migrations, client generation, seed)
- Next.js application reading `DATABASE_URL` from `.env`

## Current Local Database Topology

### Docker service

- Compose file: `docker-compose.yml`
- Service name: `postgres`
- Container name: `padelsquash-postgres`
- Image: `postgres:16-alpine`

### Host port mapping

- Docker container port: `5432`
- Host port: `55432`

We intentionally use `55432` instead of `5432` because many Windows machines already have a local PostgreSQL instance on `5432`, which can cause Prisma to connect to the wrong server.

### Environment variable

Configured in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/padelsquash?schema=public"
```

## Why We Use Docker for Local Postgres

- Fast setup for new developers
- No need to install/manage a system PostgreSQL instance
- Reproducible DB version (`postgres:16-alpine`)
- Easy reset via `docker compose down -v`
- Isolated project database lifecycle

## Docker Compose Configuration

`docker-compose.yml` provisions a PostgreSQL container with:

- database: `padelsquash`
- user: `postgres`
- password: `postgres`
- persistent named volume: `padelsquash_postgres_data`
- healthcheck using `pg_isready`

### Local authentication mode

The compose config uses:

```yaml
POSTGRES_HOST_AUTH_METHOD: trust
```

This is **for local development convenience only**. It avoids Windows host auth mismatch problems during Prisma setup.

Do not use `trust` in production or any exposed/shared environment.

## Local Setup (First Run)

Run from project root: `D:\Websites\padelsquash`

### 1. Start the database

```powershell
docker compose up -d postgres
```

### 2. Verify status

```powershell
docker compose ps
```

Expected:

- container `padelsquash-postgres`
- status `healthy`
- port mapping `55432->5432`

### 3. Apply Prisma migrations

```powershell
npx prisma migrate dev --name simplify_pricing_matrix
```

This will:

- create/apply SQL migrations
- update the database schema
- generate Prisma Client (unless skipped)

### 4. Generate Prisma Client (safe to run explicitly)

```powershell
npm run db:generate
```

### 5. Seed initial data

```powershell
npm run db:seed
```

Seed currently creates:

- admin user (`admin@example.com` / `Admin123!`)
- courts
- instructors
- services
- opening hours
- simplified component pricing matrix (`ComponentPrice`)

## Daily Development Commands

### Start DB

```powershell
docker compose up -d postgres
```

### Stop DB

```powershell
docker compose stop postgres
```

### Restart DB

```powershell
docker compose restart postgres
```

### View DB logs

```powershell
docker logs padelsquash-postgres --tail 200
```

### Prisma Studio (optional)

```powershell
npx prisma studio
```

## Database Reset (Development)

If you want a clean database:

```powershell
docker compose down -v
docker compose up -d postgres
npx prisma migrate dev --name reset_reinit
npm run db:seed
```

Notes:

- `-v` removes the Postgres data volume.
- This destroys all local DB data.

## Verifying the Database Manually

### List tables from inside the container

```powershell
docker exec padelsquash-postgres psql -U postgres -d padelsquash -c "\dt"
```

Expected core tables include:

- `User`
- `Service`
- `Court`
- `Instructor`
- `OpeningHour`
- `ComponentPrice`
- `Booking`
- `BookingResource`
- `Payment`
- `_prisma_migrations`

## Common Problems and Fixes

### 1. Prisma error `P1012` / `DATABASE_URL` not found

Cause:

- `.env` file missing

Fix:

```powershell
Copy-Item .env.example .env
```

Then ensure `DATABASE_URL` is set.

### 2. Prisma `P1000` authentication failed (wrong DB)

Cause:

- Prisma connects to a different PostgreSQL server on `localhost:5432`
- Common on Windows when a system PostgreSQL is already installed

Fix:

- Use a dedicated Docker host port (this project uses `55432`)
- Update `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/padelsquash?schema=public"
```

### 3. Prisma engine download failures

Cause:

- Restricted network/sandbox environment blocks Prisma engine downloads

Fix:

- Run Prisma commands on your local machine (outside restricted sandbox):
  - `npx prisma migrate dev ...`
  - `npx prisma generate`

### 4. Docker Postgres starts but Prisma still fails

Checklist:

- `docker compose ps` shows container `healthy`
- `.env` points to `127.0.0.1:55432`
- Docker Desktop is running
- No corporate endpoint/security tool blocking Docker host ports

## Prisma Migration Workflow (Team)

### When schema changes

1. Update `prisma/schema.prisma`
2. Create/apply migration locally:

```powershell
npx prisma migrate dev --name <descriptive_name>
```

3. Commit:

- `prisma/migrations/...`
- `prisma/schema.prisma`

4. Regenerate client if needed:

```powershell
npx prisma generate
```

### Important

Never edit generated migration SQL casually after it has been shared/applied unless the team explicitly agrees. Prefer a new migration.

## Production Considerations (Future)

Local Docker setup is for development only. For production readiness, plan for:

- Managed PostgreSQL or hardened self-hosted Postgres
- No `trust` auth
- Strong credentials and secret management
- TLS in transit
- Regular backups + restore drill
- DB monitoring (connections, slow queries, disk, replication if used)
- Separate migration step in deploy pipeline
- Least-privilege DB user for app runtime (distinct from migration/admin user)

## Suggested `.env` Split (Future)

- `.env.local` for developer-specific values
- `.env.production` managed by deployment platform/secret manager
- Avoid committing real credentials

## Summary

The local development database is now standardized around Docker Compose + PostgreSQL 16 on host port `55432`, with Prisma migrations and seeding used to initialize the application schema and data. This setup avoids conflicts with existing local PostgreSQL services and makes onboarding repeatable.
