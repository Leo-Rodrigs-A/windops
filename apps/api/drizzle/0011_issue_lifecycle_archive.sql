ALTER TABLE public.issues ADD COLUMN archived_at timestamptz;
--> statement-breakpoint
ALTER TABLE public.issue_sync_rows ADD COLUMN archived_at timestamptz;
--> statement-breakpoint
CREATE INDEX issues_workspace_archived_updated_idx
  ON public.issues (workspace_id, archived_at, updated_at DESC, id DESC);
--> statement-breakpoint
ALTER TABLE public.issue_events DROP CONSTRAINT issue_events_type_check;
--> statement-breakpoint
ALTER TABLE public.issue_events ADD CONSTRAINT issue_events_type_check
  CHECK (type IN ('created', 'edited', 'started', 'returned', 'released', 'completed', 'archived', 'reopened', 'reactivated'));
--> statement-breakpoint
ALTER TABLE public.issue_sync_events DROP CONSTRAINT issue_sync_events_type_check;
--> statement-breakpoint
ALTER TABLE public.issue_sync_events ADD CONSTRAINT issue_sync_events_type_check
  CHECK (type IN ('created', 'edited', 'started', 'returned', 'released', 'completed', 'archived', 'reopened', 'reactivated'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.refresh_issue_sync_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.issue_sync_rows WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.issue_sync_rows
    (id, workspace_id, park_id, turbine_id, text, completion_report, archived_at, status, created_at, updated_at, revision)
  VALUES
    (NEW.id, NEW.workspace_id, NEW.park_id, NEW.turbine_id, NEW.text, NEW.completion_report,
     NEW.archived_at, NEW.status, NEW.created_at, NEW.updated_at, NEW.revision)
  ON CONFLICT (id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id, park_id = EXCLUDED.park_id,
    turbine_id = EXCLUDED.turbine_id, text = EXCLUDED.text,
    completion_report = EXCLUDED.completion_report, archived_at = EXCLUDED.archived_at,
    status = EXCLUDED.status, created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at, revision = EXCLUDED.revision;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.refresh_issue_sync_row() TO windops_app;
