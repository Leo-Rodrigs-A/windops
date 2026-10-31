import type { IssueStatus, WorkspaceRole } from '@windops/contracts';

export type IssueTransitionOperation = 'start' | 'return' | 'release' | 'complete';
export type IssueLifecycleOperation = 'reopen' | 'archive' | 'reactivate';

export interface IssueActor {
  userId: string;
  membershipId: string;
  role: WorkspaceRole;
}

export interface IssueTransitionState {
  status: IssueStatus;
  archived: boolean;
  creatorUserId: string;
  handlerUserId: string | null;
  handlerMembershipId: string | null;
  ownerWaitElapsed: boolean;
}

export type TransitionDecision =
  | { status: 'ok'; nextStatus: IssueStatus; keepsHandler: boolean }
  | { status: 'state_conflict' | 'creator_wait' | 'action_forbidden' };

export function decideIssueTransition(
  operation: IssueTransitionOperation,
  state: IssueTransitionState,
  actor: IssueActor,
): TransitionDecision {
  if (state.archived) return { status: 'state_conflict' };
  if (operation === 'start' ? state.status !== 'pending' : state.status !== 'in_progress')
    return { status: 'state_conflict' };
  if (operation === 'start' && state.creatorUserId === actor.userId && !state.ownerWaitElapsed)
    return { status: 'creator_wait' };
  if (
    (operation === 'return' || operation === 'complete') &&
    (state.handlerUserId !== actor.userId || state.handlerMembershipId !== actor.membershipId)
  )
    return { status: 'action_forbidden' };
  if (operation === 'release' && state.handlerUserId === actor.userId)
    return { status: 'action_forbidden' };

  return {
    status: 'ok',
    nextStatus:
      operation === 'start' ? 'in_progress' : operation === 'complete' ? 'completed' : 'pending',
    keepsHandler: operation === 'start' || operation === 'complete',
  };
}

export interface IssueLifecycleState {
  status: IssueStatus;
  archived: boolean;
  creatorUserId: string;
  locationActive: boolean;
}

export type LifecycleDecision =
  | { status: 'ok' }
  | { status: 'state_conflict' | 'action_forbidden' | 'equipment_unavailable' };

export function decideIssueLifecycle(
  operation: IssueLifecycleOperation,
  state: IssueLifecycleState,
  actor: IssueActor,
): LifecycleDecision {
  if (operation === 'reopen' && (state.status !== 'completed' || state.archived))
    return { status: 'state_conflict' };
  if (operation === 'archive' && (state.status === 'completed' || state.archived))
    return { status: 'state_conflict' };
  if (
    operation === 'archive' &&
    actor.role !== 'admin' &&
    (state.creatorUserId !== actor.userId || state.status !== 'pending')
  )
    return { status: 'action_forbidden' };
  if (operation === 'reactivate' && (!state.archived || state.status === 'completed'))
    return { status: 'state_conflict' };
  if (operation !== 'archive' && !state.locationActive) return { status: 'equipment_unavailable' };
  return { status: 'ok' };
}
