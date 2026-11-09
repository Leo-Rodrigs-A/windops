ALTER TABLE "parks" DROP CONSTRAINT "parks_code_check";
--> statement-breakpoint
ALTER TABLE "parks" ALTER COLUMN "code" SET DATA TYPE varchar(16);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT workspace_id, target_code
      FROM (
        SELECT workspace_id,
          'Parque ' || lpad((substring(code FROM 3)::integer)::text,
                            greatest(2, length((substring(code FROM 3)::integer)::text)), '0') AS target_code
        FROM public.parks
      ) AS park_targets
      GROUP BY workspace_id, target_code
      HAVING count(*) > 1
    ) AS collisions
  ) THEN
    RAISE EXCEPTION 'Park name normalization would create a duplicate';
  END IF;
END $$;
--> statement-breakpoint
UPDATE public.parks
SET code = 'Parque ' || lpad((substring(code FROM 3)::integer)::text,
                             greatest(2, length((substring(code FROM 3)::integer)::text)), '0'),
    revision = revision + 1,
    updated_at = clock_timestamp();
--> statement-breakpoint
ALTER TABLE "parks" ADD CONSTRAINT "parks_code_check" CHECK ("parks"."code" ~ '^Parque [0-9]{2,6}$');
