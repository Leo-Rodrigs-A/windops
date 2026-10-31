import { describe, expect, it } from 'vitest';
import { commandHash } from '../../platform/idempotency/command-hash.js';
import { decideIssueLifecycle, decideIssueTransition } from './domain.js';

const actor = { userId: 'user-1', membershipId: 'member-1', role: 'technician' as const };
const baseTransition = {
  status: 'pending' as const,
  archived: false,
  creatorUserId: 'user-1',
  handlerUserId: null,
  handlerMembershipId: null,
  ownerWaitElapsed: false,
};

describe('issue domain decisions', () => {
  it('keeps start eligibility and the server supplied creator wait decision', () => {
    expect(decideIssueTransition('start', baseTransition, actor)).toEqual({
      status: 'creator_wait',
    });
    expect(
      decideIssueTransition('start', { ...baseTransition, ownerWaitElapsed: true }, actor),
    ).toEqual({ status: 'ok', nextStatus: 'in_progress', keepsHandler: true });
    expect(
      decideIssueTransition('start', { ...baseTransition, creatorUserId: 'user-2' }, actor),
    ).toEqual({ status: 'ok', nextStatus: 'in_progress', keepsHandler: true });
  });

  it('requires the active handler identity for return and completion', () => {
    const inProgress = {
      ...baseTransition,
      status: 'in_progress' as const,
      ownerWaitElapsed: true,
      handlerUserId: 'user-1',
      handlerMembershipId: 'member-1',
    };
    expect(
      decideIssueTransition('return', inProgress, { ...actor, membershipId: 'other' }),
    ).toEqual({
      status: 'action_forbidden',
    });
    expect(decideIssueTransition('return', inProgress, actor)).toEqual({
      status: 'ok',
      nextStatus: 'pending',
      keepsHandler: false,
    });
    expect(decideIssueTransition('complete', inProgress, actor)).toEqual({
      status: 'ok',
      nextStatus: 'completed',
      keepsHandler: true,
    });
  });

  it('preserves release, state, and archived issue restrictions', () => {
    const inProgress = { ...baseTransition, status: 'in_progress' as const };
    expect(decideIssueTransition('release', inProgress, actor)).toEqual({
      status: 'ok',
      nextStatus: 'pending',
      keepsHandler: false,
    });
    expect(
      decideIssueTransition('release', { ...inProgress, handlerUserId: actor.userId }, actor),
    ).toEqual({ status: 'action_forbidden' });
    expect(decideIssueTransition('complete', baseTransition, actor)).toEqual({
      status: 'state_conflict',
    });
    expect(decideIssueTransition('start', { ...baseTransition, archived: true }, actor)).toEqual({
      status: 'state_conflict',
    });
  });

  it('preserves archive, reopen, and reactivation policy ordering', () => {
    const admin = { ...actor, role: 'admin' as const };
    expect(
      decideIssueLifecycle(
        'archive',
        { status: 'pending', archived: false, creatorUserId: actor.userId, locationActive: true },
        actor,
      ),
    ).toEqual({ status: 'ok' });
    expect(
      decideIssueLifecycle(
        'archive',
        { status: 'in_progress', archived: false, creatorUserId: 'other', locationActive: true },
        actor,
      ),
    ).toEqual({ status: 'action_forbidden' });
    expect(
      decideIssueLifecycle(
        'archive',
        { status: 'in_progress', archived: false, creatorUserId: 'other', locationActive: true },
        admin,
      ),
    ).toEqual({ status: 'ok' });
    expect(
      decideIssueLifecycle(
        'reopen',
        { status: 'completed', archived: false, creatorUserId: 'other', locationActive: false },
        admin,
      ),
    ).toEqual({ status: 'equipment_unavailable' });
    expect(
      decideIssueLifecycle(
        'reactivate',
        { status: 'pending', archived: true, creatorUserId: 'other', locationActive: true },
        admin,
      ),
    ).toEqual({ status: 'ok' });
  });
});

describe('shared command hash', () => {
  it('retains the existing canonical SHA-256 receipt vectors', () => {
    expect(
      commandHash({ operation: 'start', issueId: 'i-1', expectedRevision: 2 }).toString('hex'),
    ).toBe('2e3a4c78d0702b4320677885484f5dd9e6f529a858c83ba00c3a358803800f37');
    expect(
      commandHash({ parkId: 'p-1', expectedRevision: 2, operation: 'archive' }).toString('hex'),
    ).toBe('ce062b104435545466698086f70e437601e28b4d524e07a8baec22252a3ad258');
    expect(commandHash({ nested: { b: 2, a: 1 } })).toEqual(
      commandHash({ nested: { a: 1, b: 2 } }),
    );
  });
});
