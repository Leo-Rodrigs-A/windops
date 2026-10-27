import type { PoolClient } from 'pg';

export interface SyncCommandReceipt {
  workspaceId: string;
  actorMembershipId: string;
  actorUserId: string;
  commandId: string;
  payloadHash: Buffer;
  result: Record<string, unknown>;
}

export interface SyncService {
  getCommandReceipt(
    client: PoolClient,
    workspaceId: string,
    actorUserId: string,
    commandId: string,
  ): Promise<Pick<SyncCommandReceipt, 'payloadHash' | 'result'> | null>;
  appendCommandReceipt(client: PoolClient, receipt: SyncCommandReceipt): Promise<void>;
}

export function createSyncService(): SyncService {
  return {
    async getCommandReceipt(client, workspaceId, actorUserId, commandId) {
      const result = await client.query<{
        payloadHash: Buffer;
        result: Record<string, unknown>;
      }>(
        `SELECT payload_hash AS "payloadHash", result
         FROM public.sync_commands
         WHERE workspace_id = $1 AND actor_user_id = $2 AND command_id = $3`,
        [workspaceId, actorUserId, commandId],
      );
      return result.rows[0] ?? null;
    },

    async appendCommandReceipt(client, receipt) {
      await client.query(
        `INSERT INTO public.sync_commands
          (workspace_id, actor_membership_id, actor_user_id, command_id, payload_hash, result)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          receipt.workspaceId,
          receipt.actorMembershipId,
          receipt.actorUserId,
          receipt.commandId,
          receipt.payloadHash,
          JSON.stringify(receipt.result),
        ],
      );
    },
  };
}
