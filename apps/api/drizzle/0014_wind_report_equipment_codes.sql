ALTER TABLE "parks" DROP CONSTRAINT "parks_code_check";
--> statement-breakpoint
ALTER TABLE "turbines" DROP CONSTRAINT "turbines_code_check";
--> statement-breakpoint
ALTER TABLE "parks" ALTER COLUMN "code" SET DATA TYPE varchar(8);
--> statement-breakpoint
ALTER TABLE "turbines" ALTER COLUMN "code" SET DATA TYPE varchar(17);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT workspace_id, target_code
      FROM (
        SELECT workspace_id,
          'P-' || lpad((substring(code FROM 2)::integer)::text, 2, '0') AS target_code
        FROM public.parks
      ) AS park_targets
      GROUP BY workspace_id, target_code
      HAVING count(*) > 1
    ) AS collisions
  ) THEN
    RAISE EXCEPTION 'Park code normalization would create a duplicate';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (
      SELECT turbine_targets.park_id, turbine_targets.target_code
      FROM (
        SELECT t.park_id,
          'ZAC-' || lpad((substring(p.code FROM 2)::integer)::text, 2, '0')
          || '-' || lpad((substring(t.code FROM 2)::integer)::text, 2, '0') AS target_code
        FROM public.turbines t
        JOIN public.parks p ON p.id = t.park_id AND p.workspace_id = t.workspace_id
      ) AS turbine_targets
      GROUP BY turbine_targets.park_id, turbine_targets.target_code
      HAVING count(*) > 1
    ) AS collisions
  ) THEN
    RAISE EXCEPTION 'Turbine code normalization would create a duplicate';
  END IF;
END $$;
--> statement-breakpoint
UPDATE public.parks
SET code = 'P-' || lpad((substring(code FROM 2)::integer)::text, 2, '0'),
    revision = revision + 1,
    updated_at = clock_timestamp();
--> statement-breakpoint
UPDATE public.turbines t
SET code = 'ZAC-' || substring(p.code FROM 3) || '-'
          || lpad((substring(t.code FROM 2)::integer)::text, 2, '0'),
    revision = t.revision + 1,
    updated_at = clock_timestamp()
FROM public.parks p
WHERE p.id = t.park_id AND p.workspace_id = t.workspace_id;
--> statement-breakpoint
DROP INDEX "turbines_workspace_park_code_idx";
--> statement-breakpoint
DROP INDEX "issues_workspace_archived_updated_idx";
--> statement-breakpoint
CREATE INDEX "parks_workspace_created_idx" ON "parks" USING btree ("workspace_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX "turbines_workspace_park_created_idx" ON "turbines" USING btree ("workspace_id", "park_id", "created_at", "id");
--> statement-breakpoint
ALTER TABLE "parks" ADD CONSTRAINT "parks_code_check" CHECK ("parks"."code" ~ '^P-[0-9]{2,6}$');
--> statement-breakpoint
ALTER TABLE "turbines" ADD CONSTRAINT "turbines_code_check" CHECK ("turbines"."code" ~ '^ZAC-[0-9]{2,6}-[0-9]{2,6}$');
