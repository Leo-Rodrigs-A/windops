CREATE TABLE "issue_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"actor_membership_id" uuid,
	"actor_user_id" uuid,
	"actor_label" text NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"before" jsonb,
	"after" jsonb,
	CONSTRAINT "issue_events_actor_pair_check" CHECK (num_nonnulls("issue_events"."actor_membership_id", "issue_events"."actor_user_id") IN (0, 2)),
	CONSTRAINT "issue_events_type_check" CHECK ("issue_events"."type" IN ('created', 'edited', 'started', 'returned', 'released')),
	CONSTRAINT "issue_events_actor_label_check" CHECK (length(btrim("issue_events"."actor_label")) > 0)
);
--> statement-breakpoint
CREATE TABLE "issue_location_references" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"park_id" uuid NOT NULL,
	"turbine_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"park_id" uuid NOT NULL,
	"turbine_id" uuid NOT NULL,
	"creator_membership_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"handler_membership_id" uuid,
	"handler_user_id" uuid,
	"text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "issues_status_check" CHECK ("issues"."status" IN ('pending', 'in_progress')),
	CONSTRAINT "issues_revision_check" CHECK ("issues"."revision" > 0),
	CONSTRAINT "issues_text_check" CHECK (char_length("issues"."text") BETWEEN 1 AND 10000 AND "issues"."text" ~ '[^[:space:]]'),
	CONSTRAINT "issues_handler_pair_check" CHECK (num_nonnulls("issues"."handler_membership_id", "issues"."handler_user_id") IN (0, 2))
);
--> statement-breakpoint
CREATE TABLE "sync_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_membership_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"payload_hash" "bytea" NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_commands_payload_hash_length_check" CHECK (octet_length("sync_commands"."payload_hash") = 32)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "issue_events_id_issue_workspace_unique" ON "issue_events" USING btree ("id","issue_id","workspace_id");--> statement-breakpoint
CREATE INDEX "issue_events_workspace_issue_occurred_idx" ON "issue_events" USING btree ("workspace_id","issue_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "issue_events_workspace_actor_idx" ON "issue_events" USING btree ("workspace_id","actor_membership_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "issue_location_references_park_idx" ON "issue_location_references" USING btree ("workspace_id","park_id");--> statement-breakpoint
CREATE INDEX "issue_location_references_turbine_idx" ON "issue_location_references" USING btree ("workspace_id","park_id","turbine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_id_workspace_unique" ON "issues" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE INDEX "issues_workspace_status_created_idx" ON "issues" USING btree ("workspace_id","status","created_at","id");--> statement-breakpoint
CREATE INDEX "issues_workspace_location_status_idx" ON "issues" USING btree ("workspace_id","park_id","turbine_id","status");--> statement-breakpoint
CREATE INDEX "issues_workspace_creator_created_idx" ON "issues" USING btree ("workspace_id","creator_user_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_commands_workspace_actor_command_unique" ON "sync_commands" USING btree ("workspace_id","actor_user_id","command_id");--> statement-breakpoint
CREATE INDEX "sync_commands_workspace_created_idx" ON "sync_commands" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "turbines_id_park_workspace_unique" ON "turbines" USING btree ("id","park_id","workspace_id");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_park_workspace_fk"
  FOREIGN KEY ("park_id", "workspace_id") REFERENCES "public"."parks"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_turbine_location_fk"
  FOREIGN KEY ("turbine_id", "park_id", "workspace_id") REFERENCES "public"."turbines"("id", "park_id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_creator_membership_fk"
  FOREIGN KEY ("creator_membership_id", "workspace_id", "creator_user_id") REFERENCES "public"."workspace_members"("id", "workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_handler_membership_fk"
  FOREIGN KEY ("handler_membership_id", "workspace_id", "handler_user_id") REFERENCES "public"."workspace_members"("id", "workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issue_events" ADD CONSTRAINT "issue_events_issue_workspace_fk"
  FOREIGN KEY ("issue_id", "workspace_id") REFERENCES "public"."issues"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issue_events" ADD CONSTRAINT "issue_events_actor_membership_fk"
  FOREIGN KEY ("actor_membership_id", "workspace_id", "actor_user_id") REFERENCES "public"."workspace_members"("id", "workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issue_location_references" ADD CONSTRAINT "issue_location_references_event_fk"
  FOREIGN KEY ("event_id", "issue_id", "workspace_id") REFERENCES "public"."issue_events"("id", "issue_id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issue_location_references" ADD CONSTRAINT "issue_location_references_issue_fk"
  FOREIGN KEY ("issue_id", "workspace_id") REFERENCES "public"."issues"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issue_location_references" ADD CONSTRAINT "issue_location_references_park_fk"
  FOREIGN KEY ("park_id", "workspace_id") REFERENCES "public"."parks"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "issue_location_references" ADD CONSTRAINT "issue_location_references_turbine_fk"
  FOREIGN KEY ("turbine_id", "park_id", "workspace_id") REFERENCES "public"."turbines"("id", "park_id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "sync_commands" ADD CONSTRAINT "sync_commands_actor_membership_fk"
  FOREIGN KEY ("actor_membership_id", "workspace_id", "actor_user_id") REFERENCES "public"."workspace_members"("id", "workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "issue_events", "issue_location_references", "sync_commands" TO windops_app;--> statement-breakpoint
REVOKE UPDATE, DELETE ON TABLE "issue_events", "issue_location_references", "sync_commands" FROM windops_app;
