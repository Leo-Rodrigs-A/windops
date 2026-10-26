import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const issueEvents = pgTable(
  'issue_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    issueId: uuid('issue_id').notNull(),
    actorMembershipId: uuid('actor_membership_id'),
    actorUserId: uuid('actor_user_id'),
    actorLabel: text('actor_label').notNull(),
    type: text('type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    before: jsonb('before').$type<Record<string, unknown> | null>(),
    after: jsonb('after').$type<Record<string, unknown> | null>(),
  },
  (table) => [
    uniqueIndex('issue_events_id_issue_workspace_unique').on(
      table.id,
      table.issueId,
      table.workspaceId,
    ),
    index('issue_events_workspace_issue_occurred_idx').on(
      table.workspaceId,
      table.issueId,
      table.occurredAt,
      table.id,
    ),
    index('issue_events_workspace_actor_idx').on(
      table.workspaceId,
      table.actorMembershipId,
      table.actorUserId,
    ),
    check(
      'issue_events_actor_pair_check',
      sql`num_nonnulls(${table.actorMembershipId}, ${table.actorUserId}) IN (0, 2)`,
    ),
    check(
      'issue_events_type_check',
      sql`${table.type} IN ('created', 'edited', 'started', 'returned', 'released')`,
    ),
    check('issue_events_actor_label_check', sql`length(btrim(${table.actorLabel})) > 0`),
    check(
      'issue_events_before_object_check',
      sql`${table.before} IS NULL OR jsonb_typeof(${table.before}) = 'object'`,
    ),
    check(
      'issue_events_after_object_check',
      sql`${table.after} IS NULL OR jsonb_typeof(${table.after}) = 'object'`,
    ),
  ],
);

export const issueLocationReferences = pgTable(
  'issue_location_references',
  {
    eventId: uuid('event_id').primaryKey(),
    issueId: uuid('issue_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    parkId: uuid('park_id').notNull(),
    turbineId: uuid('turbine_id').notNull(),
  },
  (table) => [
    index('issue_location_references_park_idx').on(table.workspaceId, table.parkId),
    index('issue_location_references_turbine_idx').on(
      table.workspaceId,
      table.parkId,
      table.turbineId,
    ),
  ],
);
