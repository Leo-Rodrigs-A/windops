ALTER TABLE "issue_events" DROP CONSTRAINT "issue_events_type_check";--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_status_check";--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_status_handler_consistency_check";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "completion_report" text;--> statement-breakpoint
ALTER TABLE "issue_events" ADD CONSTRAINT "issue_events_type_check" CHECK ("issue_events"."type" IN ('created', 'edited', 'started', 'returned', 'released', 'completed'));--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_check" CHECK ("issues"."status" IN ('pending', 'in_progress', 'completed'));--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_handler_consistency_check" CHECK (("issues"."status" = 'pending' AND "issues"."handler_membership_id" IS NULL AND "issues"."handler_user_id" IS NULL AND "issues"."completion_report" IS NULL) OR ("issues"."status" IN ('in_progress', 'completed') AND "issues"."handler_membership_id" IS NOT NULL AND "issues"."handler_user_id" IS NOT NULL));