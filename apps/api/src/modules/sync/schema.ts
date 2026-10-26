import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const syncCommands = pgTable(
  'sync_commands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    actorMembershipId: uuid('actor_membership_id').notNull(),
    actorUserId: uuid('actor_user_id').notNull(),
    commandId: uuid('command_id').notNull(),
    payloadHash: bytea('payload_hash').notNull(),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sync_commands_workspace_actor_command_unique').on(
      table.workspaceId,
      table.actorUserId,
      table.commandId,
    ),
    index('sync_commands_workspace_created_idx').on(table.workspaceId, table.createdAt),
    check('sync_commands_payload_hash_length_check', sql`octet_length(${table.payloadHash}) = 32`),
    check('sync_commands_result_object_check', sql`jsonb_typeof(${table.result}) = 'object'`),
  ],
);
