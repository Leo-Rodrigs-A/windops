CREATE TABLE "issue_sync_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"actor_label" text NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"before" jsonb,
	"after" jsonb
);
--> statement-breakpoint
CREATE INDEX "issue_sync_events_workspace_issue_occurred_idx" ON "issue_sync_events" USING btree ("workspace_id","issue_id","occurred_at","id");
--> statement-breakpoint
ALTER TABLE "issue_sync_events" ADD CONSTRAINT "issue_sync_events_issue_workspace_fk"
  FOREIGN KEY ("issue_id", "workspace_id") REFERENCES "issues"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
INSERT INTO "issue_sync_events"
  (id, workspace_id, issue_id, actor_label, type, occurred_at, before, after)
SELECT
  e.id,
  e.workspace_id,
  e.issue_id,
  e.actor_label,
  e.type,
  e.occurred_at,
  CASE WHEN e.before IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
    'text', e.before -> 'text',
    'parkId', e.before -> 'parkId',
    'turbineId', e.before -> 'turbineId',
    'status', e.before -> 'status',
    'completionReport', e.before -> 'completionReport',
    'revision', e.before -> 'revision'
  )) END,
  CASE WHEN e.after IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
    'text', e.after -> 'text',
    'parkId', e.after -> 'parkId',
    'turbineId', e.after -> 'turbineId',
    'status', e.after -> 'status',
    'completionReport', e.after -> 'completionReport',
    'revision', e.after -> 'revision'
  )) END
FROM "issue_events" e;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "issue_sync_events" TO windops_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON TABLE "issue_sync_events" FROM windops_app;
