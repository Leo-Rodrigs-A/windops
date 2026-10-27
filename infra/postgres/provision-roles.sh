#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${WINDOPS_APP_PASSWORD:?WINDOPS_APP_PASSWORD is required}"
: "${WINDOPS_MIGRATOR_PASSWORD:?WINDOPS_MIGRATOR_PASSWORD is required}"
: "${WINDOPS_REPLICATION_PASSWORD:?WINDOPS_REPLICATION_PASSWORD is required}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv app_password WINDOPS_APP_PASSWORD
\getenv migrator_password WINDOPS_MIGRATOR_PASSWORD
\getenv replication_password WINDOPS_REPLICATION_PASSWORD
\getenv database_name POSTGRES_DB

SELECT format('CREATE ROLE windops_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'windops_app')
\gexec
ALTER ROLE windops_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'app_password';

SELECT format('CREATE ROLE windops_migrator LOGIN PASSWORD %L', :'migrator_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'windops_migrator')
\gexec
ALTER ROLE windops_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'migrator_password';

SELECT format('CREATE ROLE windops_replication LOGIN REPLICATION PASSWORD %L', :'replication_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'windops_replication')
\gexec
ALTER ROLE windops_replication LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE REPLICATION PASSWORD :'replication_password';

GRANT CONNECT ON DATABASE :"database_name" TO windops_app, windops_migrator, windops_replication;
GRANT CREATE ON DATABASE :"database_name" TO windops_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE TEMPORARY ON DATABASE :"database_name" FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO windops_app, windops_replication;
GRANT USAGE, CREATE ON SCHEMA public TO windops_migrator;

CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION windops_migrator;
GRANT USAGE, CREATE ON SCHEMA drizzle TO windops_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA drizzle TO windops_migrator;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA drizzle TO windops_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE windops_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO windops_app;
ALTER DEFAULT PRIVILEGES FOR ROLE windops_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO windops_app;

SELECT 'CREATE PUBLICATION electric_publication_default'
WHERE NOT EXISTS (SELECT FROM pg_publication WHERE pubname = 'electric_publication_default')
\gexec

DO $$
DECLARE
  object_record record;
  allowlist_record record;
  column_record record;
  publication_tables text[] := ARRAY[]::text[];
BEGIN
  FOR object_record IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO windops_migrator', object_record.tablename);
    IF object_record.tablename IN ('issue_events', 'issue_location_references', 'sync_commands') THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO windops_app', object_record.tablename);
      EXECUTE format('REVOKE UPDATE, DELETE ON TABLE public.%I FROM windops_app', object_record.tablename);
    ELSIF object_record.tablename = 'issue_sync_events' THEN
      GRANT SELECT, INSERT ON TABLE public.issue_sync_events TO windops_app;
      REVOKE UPDATE, DELETE ON TABLE public.issue_sync_events FROM windops_app;
    ELSIF object_record.tablename = 'issue_sync_rows' THEN
      REVOKE INSERT, UPDATE, DELETE ON TABLE public.issue_sync_rows FROM windops_app;
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO windops_app', object_record.tablename);
    END IF;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM windops_replication', object_record.tablename);
    FOR column_record IN
      SELECT attname FROM pg_attribute
      WHERE attrelid = format('public.%I', object_record.tablename)::regclass
        AND attnum > 0 AND NOT attisdropped
    LOOP
      EXECUTE format(
        'REVOKE SELECT (%I) ON TABLE public.%I FROM windops_replication',
        column_record.attname,
        object_record.tablename
      );
    END LOOP;
  END LOOP;

  FOR allowlist_record IN
    SELECT tablename FROM (VALUES
      ('workspaces'),
      ('parks'),
      ('turbines'),
      ('issue_sync_rows'),
      ('issue_sync_events')
    ) AS approved(tablename)
  LOOP
    IF to_regclass(format('public.%I', allowlist_record.tablename)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', allowlist_record.tablename);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO windops_replication', allowlist_record.tablename);
    publication_tables := array_append(publication_tables, format('public.%I', allowlist_record.tablename));
  END LOOP;

  IF cardinality(publication_tables) > 0 THEN
    EXECUTE 'ALTER PUBLICATION electric_publication_default SET TABLE ' || array_to_string(publication_tables, ', ');
  END IF;
END
$$;
SQL
