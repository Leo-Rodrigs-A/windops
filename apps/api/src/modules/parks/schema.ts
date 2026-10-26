import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const parks = pgTable(
  'parks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    code: varchar('code', { length: 7 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    revision: integer('revision').notNull().default(1),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('parks_workspace_code_unique').on(table.workspaceId, table.code),
    uniqueIndex('parks_id_workspace_unique').on(table.id, table.workspaceId),
    check('parks_code_check', sql`${table.code} ~ '^P[0-9]{2,6}$'`),
    check('parks_revision_check', sql`${table.revision} > 0`),
  ],
);

export const turbines = pgTable(
  'turbines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    parkId: uuid('park_id').notNull(),
    code: varchar('code', { length: 7 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    revision: integer('revision').notNull().default(1),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('turbines_park_code_unique').on(table.parkId, table.code),
    uniqueIndex('turbines_id_workspace_unique').on(table.id, table.workspaceId),
    uniqueIndex('turbines_id_park_workspace_unique').on(table.id, table.parkId, table.workspaceId),
    index('turbines_workspace_park_code_idx').on(
      table.workspaceId,
      table.parkId,
      table.code,
      table.id,
    ),
    check('turbines_code_check', sql`${table.code} ~ '^T[0-9]{2,6}$'`),
    check('turbines_revision_check', sql`${table.revision} > 0`),
  ],
);
