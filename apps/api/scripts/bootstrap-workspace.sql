\set ON_ERROR_STOP on

BEGIN;
SELECT pg_advisory_xact_lock(1_947_122_026);
SELECT set_config('windops.bootstrap_workspace_id', :'workspace_id', true);
SELECT set_config('windops.bootstrap_workspace_name', :'workspace_name', true);
SELECT set_config('windops.bootstrap_user_id', :'user_id', true);

DO $bootstrap$
DECLARE
  target_workspace_id uuid := current_setting('windops.bootstrap_workspace_id')::uuid;
  target_workspace_name text := current_setting('windops.bootstrap_workspace_name');
  target_user_id uuid := current_setting('windops.bootstrap_user_id')::uuid;
  target_user_verified boolean;
BEGIN
  IF btrim(target_workspace_name) = '' THEN
    RAISE EXCEPTION 'workspace_name must not be empty';
  END IF;

  SELECT email_verified
    INTO target_user_verified
    FROM public.auth_users
   WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'explicit bootstrap user does not exist';
  END IF;
  IF target_user_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'bootstrap user email must be verified';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.workspaces
     WHERE id <> target_workspace_id
        OR (id = target_workspace_id AND name <> target_workspace_name)
  ) THEN
    RAISE EXCEPTION 'workspace conflicts with the existing pilot workspace';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.workspace_members
     WHERE user_id = target_user_id
       AND (workspace_id <> target_workspace_id OR role <> 'admin' OR revoked_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'bootstrap user already has a conflicting membership';
  END IF;

  INSERT INTO public.workspaces (id, name)
  VALUES (target_workspace_id, target_workspace_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (target_workspace_id, target_user_id, 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
      FROM public.workspace_members
     WHERE workspace_id = target_workspace_id
       AND user_id = target_user_id
       AND role = 'admin'
       AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'bootstrap did not produce an active administrator membership';
  END IF;
END
$bootstrap$;

COMMIT;
