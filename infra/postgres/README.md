# PostgreSQL roles

## Local WSL development

`windops` remains the bootstrap administrator so an existing PostgreSQL volume keeps its initialized owner and credentials. The API, Drizzle migration process and Electric use three separate logins:

| Role                  | Permissions                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `windops_app`         | Connect, schema usage and DML on application tables. No schema/database creation, temporary tables, role management or replication.     |
| `windops_migrator`    | Own application tables, create application objects and update the Drizzle journal. No superuser, database/role creation or replication. |
| `windops_replication` | `REPLICATION`, connect, schema usage and `SELECT` on explicitly published tables only. No DDL or role management.                       |

`pnpm db:setup` is the repeatable path for a new installation and an existing volume. It brings up Compose without deleting volumes, reconciles roles through the administrative connection inside the PostgreSQL container, applies migrations with `MIGRATION_DATABASE_URL`, then refreshes the Electric table allowlist. Docker init scripts alone are insufficient for an existing volume, so the explicit provision step is intentional.

The provisioner transfers ownership of existing `public` tables to the migrator and grants runtime DML. Future tables created by the migrator receive runtime DML through default privileges. Replication grants are explicit: at this stage only `public.workspaces` is granted and published. Future domain migrations must add approved tables to both the grant allowlist and publication; authentication tables must stay excluded.

Local passwords in `.env.example` are disposable development values. Change them in the ignored root `.env` before exposing the local database beyond loopback. `POSTGRES_USER=windops` and its existing password remain unchanged, so this update does not require deleting or recreating the PostgreSQL volume.

## Production database preparation

Neon has not been provisioned or validated. Before deployment, create the three role URLs in the production secret store and apply equivalent grants through the Neon administrative connection. Use direct, TLS-verified connections for migration and replication. The API container receives only `DATABASE_URL`; the migration task receives only `MIGRATION_DATABASE_URL`; Electric receives only `ELECTRIC_DATABASE_URL` and runs with manual table publishing enabled.

The manual publication must include only explicitly approved business tables, each with `REPLICA IDENTITY FULL`, and the replication role must have `SELECT` only on that allowlist. Neon-specific logical replication setup and role capabilities must be confirmed against the selected Neon plan before calling production ready.
