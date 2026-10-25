import { acceptWorkspaceInvitationSchema } from '@windops/contracts';

const pendingInvitationStorageKey = 'windops.pending-invitation-token';

export function captureInvitationToken() {
  let token = '';
  try {
    token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    if (token) {
      const parsed = acceptWorkspaceInvitationSchema.safeParse({ token });
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
      if (!parsed.success) {
        sessionStorage.removeItem(pendingInvitationStorageKey);
        return { token: '', error: 'Este link de convite está malformado.' };
      }
      sessionStorage.setItem(pendingInvitationStorageKey, parsed.data.token);
    }
    return { token: sessionStorage.getItem(pendingInvitationStorageKey) ?? '', error: '' };
  } catch {
    return {
      token: '',
      error:
        'Não foi possível guardar o convite nesta aba. Abra o link novamente em uma aba comum.',
    };
  }
}

export function hasPendingInvitation() {
  try {
    return Boolean(sessionStorage.getItem(pendingInvitationStorageKey));
  } catch {
    return false;
  }
}

export function clearPendingInvitation() {
  try {
    sessionStorage.removeItem(pendingInvitationStorageKey);
  } catch {
    // Storage may be unavailable; the invitation page will report that state.
  }
}

export function getPendingInvitationToken() {
  try {
    return sessionStorage.getItem(pendingInvitationStorageKey) ?? '';
  } catch {
    return '';
  }
}
