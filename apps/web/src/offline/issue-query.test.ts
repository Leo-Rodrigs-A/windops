import { describe, expect, it } from 'vitest';
import { selectIssueProjection } from './issue-query';
import type { LocalIssueCommand, LocalIssueProjection } from './local-issue-store';

const projection: LocalIssueProjection = {
  id: 'issue',
  workspaceId: 'workspace',
  serverRevision: 4,
  serverActive: false,
  localRevision: 1,
  updatedAt: '2026-01-02',
  local: { parkId: 'park', turbineId: 'turbine', text: 'local', status: 'completed' },
  serverIssue: {
    id: 'issue',
    workspaceId: 'workspace',
    parkId: 'park',
    turbineId: 'turbine',
    text: 'remote',
    status: 'pending',
    completionReport: null,
    revision: 4,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
  },
};
const command: LocalIssueCommand = {
  id: 'command',
  issueId: 'issue',
  chainId: 'issue',
  workspaceId: 'workspace',
  kind: 'complete',
  payload: {},
  status: 'pending',
  dependsOn: null,
  baseServerRevision: 4,
  createdAt: '2026-01-03',
  attemptedAt: null,
  frozenPayload: null,
  blockReason: null,
};
describe('seleção de consultas locais', () => {
  it('não classifica tombstone como conclusão e preserva conclusão pendente', () => {
    expect(selectIssueProjection(projection, [], { status: 'completed' })).toBeNull();
    expect(selectIssueProjection(projection, [command], { status: 'completed' })).toMatchObject({
      sortAt: '2026-01-03',
    });
    expect(
      selectIssueProjection(projection, [{ ...command, status: 'conflict' }], {
        status: 'completed',
      }),
    ).toBeNull();
    expect(
      selectIssueProjection(projection, [command], { status: 'completed', parkId: 'other' }),
    ).toBeNull();
  });
  it('reabertura recente supera ACK antigo e arquivo exclui Histórico', () => {
    if (!projection.serverIssue) throw new Error('Missing remote');
    const ack = { ...projection.serverIssue, revision: 3, status: 'completed' as const };
    expect(
      selectIssueProjection(
        projection,
        [{ ...command, status: 'confirmed_waiting_replica', acknowledgedIssue: ack }],
        { status: 'completed' },
      ),
    ).toBeNull();
    const archived = {
      ...projection,
      serverIssue: { ...projection.serverIssue, archivedAt: '2026-01-04' },
    };
    expect(selectIssueProjection(archived, [command], { status: 'completed' })).toBeNull();
    expect(selectIssueProjection(archived, [], { status: 'archived' })).toMatchObject({
      sortAt: '2026-01-04',
    });
  });
});
