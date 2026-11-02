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

Neon is provisioned, but production grants, TLS and publication have not yet been validated. The owner created separate runtime, migration and replication logins and stored their URLs in the protected VPS environment. Use direct connections for migration and replication; keep the API on `DATABASE_URL`, the migration task on `MIGRATION_DATABASE_URL`, and Electric on `ELECTRIC_DATABASE_URL` with manual table publishing.

### Neon replication privilege exception — accepted by owner 02/11/2026

The current `windops_replication` role was created through Neon role management and is a member of the provider-managed `neon_superuser`, granted by `cloud_admin`. `windops-production_owner` has no `ADMIN OPTION` to remove that membership. Neon documents that Console/API/CLI roles inherit this elevated role, while SQL-created limited roles cannot receive `REPLICATION` manually. The owner chose to keep Neon and explicitly accepts this exception for the Electric connection.

This is **not equivalent to the least-privilege replication role used in local PostgreSQL**. The role has broad database access (including elevated DDL/role and data privileges); table-level revokes do not narrow inherited privileges. Manual publication still limits the logical change stream Electric consumes, but it does not limit what the credential could query if Electric or its secret were compromised. Compensating controls: store the URL only in root-owned `/opt/windops/infra/.env.production`; Compose passes it only to Electric; keep Electric on the private Docker network with no published port; expose sync only through the authenticated API proxy; keep the manual publication on the explicit sanitized allowlist; never use this URL in API, web, CI or diagnostic tooling. Reassess before onboarding production data or changing the provider.

The manual publication includes only explicitly approved tables. Electric 1.8.1 requires `REPLICA IDENTITY FULL` and therefore publishes every column in each listed table. Any table with private fields must be replaced by a sanitized projection before publication. On Neon, the broad role exception above means SQL `SELECT` grants are not an authorization boundary for the Electric credential.

`issue_events`, `issue_location_references` and `sync_commands` are private and are never published. `issue_sync_events` contains only actor label and sanitized snapshots, without membership/user IDs. The runtime role may read/insert append-only event records but cannot update or delete them. The role provisioning script reapplies these table-specific grants after migrations; migrations also revoke write privileges beyond insert.
