CREATE TABLE "parks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"code" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "parks_code_check" CHECK ("parks"."code" ~ '^P[0-9]{2,6}$'),
	CONSTRAINT "parks_revision_check" CHECK ("parks"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "turbines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"park_id" uuid NOT NULL,
	"code" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "turbines_code_check" CHECK ("turbines"."code" ~ '^T[0-9]{2,6}$'),
	CONSTRAINT "turbines_revision_check" CHECK ("turbines"."revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "parks_workspace_code_unique" ON "parks" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "parks_id_workspace_unique" ON "parks" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "turbines_park_code_unique" ON "turbines" USING btree ("park_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "turbines_id_workspace_unique" ON "turbines" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE INDEX "turbines_workspace_park_code_idx" ON "turbines" USING btree ("workspace_id","park_id","code","id");
--> statement-breakpoint
-- Cross-module tenant constraints stay in SQL so the parks module does not import workspace schema.
ALTER TABLE "parks" ADD CONSTRAINT "parks_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "turbines" ADD CONSTRAINT "turbines_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "turbines" ADD CONSTRAINT "turbines_park_workspace_fk"
  FOREIGN KEY ("park_id", "workspace_id") REFERENCES "public"."parks"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
