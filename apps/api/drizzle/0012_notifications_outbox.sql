CREATE TABLE public.notifications (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recipient_user_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE RESTRICT,
  issue_id uuid NOT NULL,
  event_id uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('created', 'edited', 'started', 'returned', 'released', 'completed', 'archived', 'reopened', 'reactivated')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  read_at timestamptz,
  suppressed_at timestamptz,
  UNIQUE (workspace_id, recipient_user_id, event_id),
  FOREIGN KEY (workspace_id, recipient_user_id) REFERENCES public.workspace_members(workspace_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id, workspace_id) REFERENCES public.issues(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id, issue_id, workspace_id) REFERENCES public.issue_events(id, issue_id, workspace_id) ON DELETE RESTRICT
);
CREATE INDEX notifications_recipient_page_idx ON public.notifications(workspace_id, recipient_user_id, created_at DESC, id DESC);
CREATE INDEX notifications_unread_idx ON public.notifications(workspace_id, recipient_user_id) WHERE read_at IS NULL;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE RESTRICT,
  endpoint text NOT NULL CHECK (length(endpoint) BETWEEN 1 AND 2048),
  endpoint_hash bytea NOT NULL CHECK (octet_length(endpoint_hash) = 32),
  p256dh text NOT NULL CHECK (length(p256dh) BETWEEN 1 AND 256),
  auth_secret text NOT NULL CHECK (length(auth_secret) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  UNIQUE (workspace_id, user_id, endpoint_hash),
  FOREIGN KEY (workspace_id, user_id) REFERENCES public.workspace_members(workspace_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX push_subscriptions_active_user_idx ON public.push_subscriptions(workspace_id, user_id) WHERE revoked_at IS NULL;

CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL,
  issue_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'cancelled', 'dead')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_until timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (workspace_id, recipient_user_id, event_id, subscription_id),
  FOREIGN KEY (workspace_id, recipient_user_id) REFERENCES public.workspace_members(workspace_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id, issue_id, workspace_id) REFERENCES public.issue_events(id, issue_id, workspace_id) ON DELETE RESTRICT,
  CHECK ((status = 'claimed') = (lease_until IS NOT NULL)),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL)),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);
CREATE INDEX notification_deliveries_claim_idx ON public.notification_deliveries(available_at, created_at, id) WHERE status IN ('pending', 'claimed');
CREATE INDEX notification_deliveries_event_idx ON public.notification_deliveries(workspace_id, issue_id, recipient_user_id, event_id, status);

GRANT SELECT, INSERT, UPDATE ON public.notifications, public.push_subscriptions, public.notification_deliveries TO windops_app;
REVOKE DELETE ON public.notifications, public.push_subscriptions, public.notification_deliveries FROM windops_app;
