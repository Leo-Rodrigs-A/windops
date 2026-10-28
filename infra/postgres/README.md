# PostgreSQL roles

## Local WSL development

`windops` remains the bootstrap administrator so an existing PostgreSQL volume keeps its initialized owner and credentials. The API, Drizzle migration process and Electric use three separate logins:

| Role                  | Permissions                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `windops_app`         | Connect, schema usage and DML on application tables. No schema/database creation, temporary tables, role management or replication.     |
| `windops_migrator`    | Own application tables, create application objects and update the Drizzle journal. No superuser, database/role creation or replication. |
| `windops_replication` | `REPLICATION`, connect, schema usage and `SELECT` on explicitly published tables only. No DDL or role management.                       |

`pnpm db:setup` is the repeatable path for a new installation and an existing volume. It brings up Compose without deleting volumes, reconciles roles through the administrative connection inside the PostgreSQL container, applies migrations with `MIGRATION_DATABASE_URL`, then refreshes the Electric table and column allowlist. Docker init scripts alone are insufficient for an existing volume, so the explicit provision step is intentional.

The provisioner transfers ownership of existing `public` tables to the migrator and grants runtime DML. Future tables created by the migrator receive runtime DML through default privileges. Replication grants and publication are reconciled from one explicit table allowlist: `workspaces`, `parks`, `turbines`, the sanitized `issue_sync_rows` mirror, and the append-only `issue_sync_events` projection. Raw `issues`, `issue_events`, memberships, auth tables, invitations, location references and `sync_commands` stay private. Electric 1.8.1 requires `REPLICA IDENTITY FULL` and publishes all columns of each listed table, so both issue projections contain only fields approved for offline sync, including the issue archive marker. The proxy still fixes returned columns and workspace filters.

Local passwords in `.env.example` are disposable development values. Change them in the ignored root `.env` before exposing the local database beyond loopback. `POSTGRES_USER=windops` and its existing password remain unchanged, so this update does not require deleting or recreating the PostgreSQL volume.

## Production database preparation

Neon has not been provisioned or validated. Before deployment, create the three role URLs in the production secret store and apply equivalent grants through the Neon administrative connection. Use direct, TLS-verified connections for migration and replication. The API container receives only `DATABASE_URL`; the migration task receives only `MIGRATION_DATABASE_URL`; Electric receives only `ELECTRIC_DATABASE_URL` and runs with manual table publishing enabled.

The manual publication includes only explicitly approved tables and grants `SELECT` only on that table allowlist. Electric 1.8.1 requires `REPLICA IDENTITY FULL` and therefore publishes every column in each listed table. Any table with private fields must be replaced by a sanitized projection before publication. Neon-specific logical replication setup and role capabilities must be confirmed against the selected Neon plan before calling production ready.

`issue_events`, `issue_location_references` and `sync_commands` are private and are never published. `issue_sync_events` contains only actor label and sanitized snapshots, without membership/user IDs. The runtime role may read/insert append-only event records but cannot update or delete them. The role provisioning script reapplies these table-specific grants after migrations; migrations also revoke write privileges beyond insert.
