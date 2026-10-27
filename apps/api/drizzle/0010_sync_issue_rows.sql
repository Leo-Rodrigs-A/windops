CREATE TABLE "issue_sync_rows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"park_id" uuid NOT NULL,
	"turbine_id" uuid NOT NULL,
	"text" text NOT NULL,
	"completion_report" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"revision" integer NOT NULL
);
--> statement-breakpoint
INSERT INTO public.issue_sync_rows
  (id, workspace_id, park_id, turbine_id, text, completion_report, status, created_at, updated_at, revision)
SELECT id, workspace_id, park_id, turbine_id, text, completion_report, status, created_at, updated_at, revision
FROM public.issues;
--> statement-breakpoint
CREATE FUNCTION public.refresh_issue_sync_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.issue_sync_rows WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.issue_sync_rows
    (id, workspace_id, park_id, turbine_id, text, completion_report, status, created_at, updated_at, revision)
  VALUES
    (NEW.id, NEW.workspace_id, NEW.park_id, NEW.turbine_id, NEW.text, NEW.completion_report,
     NEW.status, NEW.created_at, NEW.updated_at, NEW.revision)
  ON CONFLICT (id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    park_id = EXCLUDED.park_id,
    turbine_id = EXCLUDED.turbine_id,
    text = EXCLUDED.text,
    completion_report = EXCLUDED.completion_report,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    revision = EXCLUDED.revision;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER issues_sync_projection
AFTER INSERT OR UPDATE OR DELETE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.refresh_issue_sync_row();
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.refresh_issue_sync_row() TO windops_app;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON public.issue_sync_rows FROM windops_app;
