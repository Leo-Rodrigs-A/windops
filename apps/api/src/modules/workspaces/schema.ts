import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });
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
    revision: integer('revision').notNull().default(1),
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

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('technician'),
    invitedByUserId: uuid('invited_by_user_id').notNull(),
    tokenHash: bytea('token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: uuid('accepted_by_user_id'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    supersededByInvitationId: uuid('superseded_by_invitation_id'),
    deliveryStatus: text('delivery_status').notNull().default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveryFailedAt: timestamp('delivery_failed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('workspace_invitations_id_workspace_unique').on(table.id, table.workspaceId),
    uniqueIndex('workspace_invitations_token_hash_unique').on(table.tokenHash),
    uniqueIndex('workspace_invitations_active_email_unique')
      .on(table.workspaceId, table.email)
      .where(
        sql`${table.acceptedAt} IS NULL AND ${table.revokedAt} IS NULL AND ${table.supersededByInvitationId} IS NULL`,
      ),
    index('workspace_invitations_workspace_created_idx').on(
      table.workspaceId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    foreignKey({
      name: 'workspace_invitations_inviter_membership_fk',
      columns: [table.workspaceId, table.invitedByUserId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'workspace_invitations_superseded_same_workspace_fk',
      columns: [table.supersededByInvitationId, table.workspaceId],
      foreignColumns: [table.id, table.workspaceId],
    }).onDelete('restrict'),
    check(
      'workspace_invitations_email_normalized_check',
      sql`${table.email} = lower(btrim(${table.email})) AND length(${table.email}) BETWEEN 3 AND 320`,
    ),
    check('workspace_invitations_role_check', sql`${table.role} in ('admin', 'technician')`),
    check(
      'workspace_invitations_token_hash_length_check',
      sql`octet_length(${table.tokenHash}) = 32`,
    ),
    check('workspace_invitations_expiration_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'workspace_invitations_terminal_state_check',
      sql`num_nonnulls(${table.acceptedAt}, ${table.revokedAt}, ${table.supersededByInvitationId}) <= 1`,
    ),
    check(
      'workspace_invitations_acceptor_check',
      sql`(${table.acceptedAt} IS NULL) = (${table.acceptedByUserId} IS NULL)`,
    ),
    check(
      'workspace_invitations_delivery_state_check',
      sql`(${table.deliveryStatus} = 'pending' AND ${table.sentAt} IS NULL AND ${table.deliveryFailedAt} IS NULL) OR (${table.deliveryStatus} = 'sent' AND ${table.sentAt} IS NOT NULL AND ${table.deliveryFailedAt} IS NULL) OR (${table.deliveryStatus} = 'failed' AND ${table.sentAt} IS NULL AND ${table.deliveryFailedAt} IS NOT NULL AND ${table.revokedAt} IS NOT NULL)`,
    ),
  ],
);
