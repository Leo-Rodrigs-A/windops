CREATE TABLE public.auth_signup_intents (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  token_hash bytea NOT NULL CHECK (octet_length(token_hash) = 32),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX auth_signup_intents_email_created_idx
  ON public.auth_signup_intents(email, created_at DESC);
CREATE UNIQUE INDEX auth_signup_intents_active_token_unique
  ON public.auth_signup_intents(token_hash) WHERE consumed_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.auth_signup_intents TO windops_app;
REVOKE DELETE ON public.auth_signup_intents FROM windops_app;
