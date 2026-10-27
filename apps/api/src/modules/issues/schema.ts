import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    parkId: uuid('park_id').notNull(),
    turbineId: uuid('turbine_id').notNull(),
    creatorMembershipId: uuid('creator_membership_id').notNull(),
    creatorUserId: uuid('creator_user_id').notNull(),
    handlerMembershipId: uuid('handler_membership_id'),
    handlerUserId: uuid('handler_user_id'),
    text: text('text').notNull(),
    completionReport: text('completion_report'),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    revision: integer('revision').notNull().default(1),
  },
  (table) => [
    uniqueIndex('issues_id_workspace_unique').on(table.id, table.workspaceId),
    index('issues_workspace_status_created_idx').on(
      table.workspaceId,
      table.status,
      table.createdAt,
      table.id,
    ),
    index('issues_workspace_location_status_idx').on(
      table.workspaceId,
      table.parkId,
      table.turbineId,
      table.status,
    ),
    index('issues_workspace_creator_created_idx').on(
      table.workspaceId,
      table.creatorUserId,
      table.createdAt,
      table.id,
    ),
    check('issues_status_check', sql`${table.status} IN ('pending', 'in_progress', 'completed')`),
    check('issues_revision_check', sql`${table.revision} > 0`),
    check(
      'issues_status_handler_consistency_check',
      sql`(${table.status} = 'pending' AND ${table.handlerMembershipId} IS NULL AND ${table.handlerUserId} IS NULL AND ${table.completionReport} IS NULL) OR (${table.status} IN ('in_progress', 'completed') AND ${table.handlerMembershipId} IS NOT NULL AND ${table.handlerUserId} IS NOT NULL)`,
    ),
    check(
      'issues_text_check',
      sql`char_length(${table.text}) BETWEEN 1 AND 10000 AND ${table.text} ~ '[^[:space:]]'`,
    ),
    check(
      'issues_handler_pair_check',
      sql`num_nonnulls(${table.handlerMembershipId}, ${table.handlerUserId}) IN (0, 2)`,
    ),
  ],
);

// Sanitized mirror used by Electric; identity fields stay on the private issues table.
export const issueSyncRows = pgTable('issue_sync_rows', {
  id: uuid('id').primaryKey(),
  workspaceId: uuid('workspace_id').notNull(),
  parkId: uuid('park_id').notNull(),
  turbineId: uuid('turbine_id').notNull(),
  text: text('text').notNull(),
  completionReport: text('completion_report'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  revision: integer('revision').notNull(),
});
