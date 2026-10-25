import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
// Pilot limit. Authorization must still scope all tenant data by workspace.
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  () => [uniqueIndex('workspaces_singleton').on(sql`(true)`)],
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('workspace_members_workspace_user_unique').on(table.workspaceId, table.userId),
    uniqueIndex('workspace_members_id_workspace_user_unique').on(
      table.id,
      table.workspaceId,
      table.userId,
    ),
    index('workspace_members_user_revoked_idx').on(table.userId, table.revokedAt),
    index('workspace_members_workspace_revoked_idx').on(table.workspaceId, table.revokedAt),
    check('workspace_members_role_check', sql`${table.role} in ('admin', 'technician')`),
  ],
);
