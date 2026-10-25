CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'technician' NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"superseded_by_invitation_id" uuid,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"delivery_failed_at" timestamp with time zone,
	CONSTRAINT "workspace_invitations_email_normalized_check" CHECK ("workspace_invitations"."email" = lower(btrim("workspace_invitations"."email")) AND length("workspace_invitations"."email") BETWEEN 3 AND 320),
	CONSTRAINT "workspace_invitations_role_check" CHECK ("workspace_invitations"."role" in ('admin', 'technician')),
	CONSTRAINT "workspace_invitations_token_hash_length_check" CHECK (octet_length("workspace_invitations"."token_hash") = 32),
	CONSTRAINT "workspace_invitations_expiration_check" CHECK ("workspace_invitations"."expires_at" > "workspace_invitations"."created_at"),
	CONSTRAINT "workspace_invitations_terminal_state_check" CHECK (num_nonnulls("workspace_invitations"."accepted_at", "workspace_invitations"."revoked_at", "workspace_invitations"."superseded_by_invitation_id") <= 1),
	CONSTRAINT "workspace_invitations_acceptor_check" CHECK (("workspace_invitations"."accepted_at" IS NULL) = ("workspace_invitations"."accepted_by_user_id" IS NULL)),
	CONSTRAINT "workspace_invitations_delivery_state_check" CHECK (("workspace_invitations"."delivery_status" = 'pending' AND "workspace_invitations"."sent_at" IS NULL AND "workspace_invitations"."delivery_failed_at" IS NULL) OR ("workspace_invitations"."delivery_status" = 'sent' AND "workspace_invitations"."sent_at" IS NOT NULL AND "workspace_invitations"."delivery_failed_at" IS NULL) OR ("workspace_invitations"."delivery_status" = 'failed' AND "workspace_invitations"."sent_at" IS NULL AND "workspace_invitations"."delivery_failed_at" IS NOT NULL AND "workspace_invitations"."revoked_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_id_workspace_unique" ON "workspace_invitations" USING btree ("id","workspace_id");--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_inviter_membership_fk" FOREIGN KEY ("workspace_id","invited_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_superseded_same_workspace_fk" FOREIGN KEY ("superseded_by_invitation_id","workspace_id") REFERENCES "public"."workspace_invitations"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_token_hash_unique" ON "workspace_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_active_email_unique" ON "workspace_invitations" USING btree ("workspace_id","email") WHERE "workspace_invitations"."accepted_at" IS NULL AND "workspace_invitations"."revoked_at" IS NULL AND "workspace_invitations"."superseded_by_invitation_id" IS NULL;--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_created_idx" ON "workspace_invitations" USING btree ("workspace_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_acceptor_user_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
