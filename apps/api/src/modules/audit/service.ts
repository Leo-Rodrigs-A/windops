import type { IssueEventType } from '@windops/contracts';
import type { PoolClient } from 'pg';

export interface AppendIssueEventInput {
  id: string;
  workspaceId: string;
  issueId: string;
  actorMembershipId: string;
  actorUserId: string;
  actorLabel: string;
  type: IssueEventType;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  location?: { parkId: string; turbineId: string };
}

export interface AuditService {
  appendIssueEvent(client: PoolClient, input: AppendIssueEventInput): Promise<void>;
}

export function createAuditService(): AuditService {
  return {
    async appendIssueEvent(client, input) {
      await client.query(
        `INSERT INTO public.issue_events
          (id, workspace_id, issue_id, actor_membership_id, actor_user_id, actor_label,
           type, before, after)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
        [
          input.id,
          input.workspaceId,
          input.issueId,
          input.actorMembershipId,
          input.actorUserId,
          input.actorLabel,
          input.type,
          input.before === null ? null : JSON.stringify(input.before),
          input.after === null ? null : JSON.stringify(input.after),
        ],
      );
      if (input.location)
        await client.query(
          `INSERT INTO public.issue_location_references
            (event_id, issue_id, workspace_id, park_id, turbine_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            input.id,
            input.issueId,
            input.workspaceId,
            input.location.parkId,
            input.location.turbineId,
          ],
        );
    },
  };
}
