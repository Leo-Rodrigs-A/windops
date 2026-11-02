-- Run as windops_migrator after Drizzle migrations.
-- This reconciles runtime grants and the explicit Electric publication only;
-- it does not create roles or claim least-privilege for Neon replication.
BEGIN;

DO $$
BEGIN
  IF current_user <> 'windops_migrator' THEN
    RAISE EXCEPTION 'provision-neon.sql must run as windops_migrator (current_user=%)', current_user;
  END IF;

  IF NOT has_schema_privilege('windops_app', 'public', 'USAGE')
    OR NOT has_schema_privilege('windops_replication', 'public', 'USAGE') THEN
    RAISE EXCEPTION 'runtime and replication roles must have USAGE on schema public';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tableowner <> current_user
  ) THEN
    RAISE EXCEPTION 'public tables must be owned by windops_migrator before provisioning';
  END IF;

  IF EXISTS (
    SELECT approved.tablename
    FROM (VALUES
      ('workspaces'), ('parks'), ('turbines'), ('issue_sync_rows'), ('issue_sync_events')
    ) AS approved(tablename)
    WHERE to_regclass(format('public.%I', approved.tablename)) IS NULL
  ) THEN
    RAISE EXCEPTION 'one or more approved Electric tables are missing';
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO windops_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO windops_app;

ALTER DEFAULT PRIVILEGES FOR ROLE windops_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO windops_app;
ALTER DEFAULT PRIVILEGES FOR ROLE windops_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO windops_app;

DO $$
DECLARE
  object_record record;
  column_record record;
  allowlist_record record;
  publication_table_sql constant text :=
    'public.workspaces, public.parks, public.turbines, public.issue_sync_rows, public.issue_sync_events';
BEGIN
  FOR object_record IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM windops_app', object_record.tablename);

    IF object_record.tablename IN ('issue_events', 'issue_location_references', 'sync_commands') THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO windops_app', object_record.tablename);
    ELSIF object_record.tablename IN (
      'auth_signup_intents', 'notifications', 'push_subscriptions', 'notification_deliveries'
    ) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO windops_app', object_record.tablename);
    ELSIF object_record.tablename = 'issue_sync_events' THEN
      GRANT SELECT, INSERT ON TABLE public.issue_sync_events TO windops_app;
    ELSIF object_record.tablename = 'issue_sync_rows' THEN
      GRANT SELECT ON TABLE public.issue_sync_rows TO windops_app;
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
      ('workspaces'), ('parks'), ('turbines'), ('issue_sync_rows'), ('issue_sync_events')
    ) AS approved(tablename)
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', allowlist_record.tablename);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO windops_replication', allowlist_record.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication_default') THEN
    EXECUTE 'ALTER PUBLICATION electric_publication_default SET TABLE ' || publication_table_sql;
  ELSE
    EXECUTE 'CREATE PUBLICATION electric_publication_default FOR TABLE ' || publication_table_sql;
  END IF;
END
$$;

COMMIT;
