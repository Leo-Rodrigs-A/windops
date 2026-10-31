import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createIdentityProvider } from '../src/modules/identity/index.ts';
import { parseEnvironment } from '../src/platform/config.ts';
import { createEmailSender } from '../src/platform/email.ts';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const env = parseEnvironment(process.env);
assert.ok(env.SMTP_URL, 'SMTP_URL is required for the auth integration check.');
const database = `windops_f04_auth_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml'];
const origin = env.APP_ORIGIN;
const email = `auth-f04-${process.pid}@example.invalid`;
const password = 'Long-Password-For-Testing-2026!';
const newPassword = 'Changed-Password-For-Testing-2026!';
const testSecret = randomBytes(48).toString('base64url');
const mailpitUrl = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
let databaseCreated = false;
let app;
let pool;
const trackedMailIds = new Set();
const seenMailIds = new Set();
let identity;

function docker(args) {
  execFileSync('docker', args, { stdio: 'inherit' });
}

function connectionFor(urlString) {
  const url = new URL(urlString);
  url.pathname = `/${database}`;
  return url.toString();
}

function provisionRoles() {
  docker([
    ...compose,
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${database}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);
}

function runMigrations() {
  execFileSync('./apps/api/node_modules/.bin/tsx', ['apps/api/src/platform/database/migrate.ts'], {
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: connectionFor(process.env.MIGRATION_DATABASE_URL),
    },
    stdio: 'inherit',
  });
}

async function startApp(sender = createEmailSender(env), withGoogle = false) {
  identity = createIdentityProvider(
    pool,
    origin,
    testSecret,
    sender,
    withGoogle ? { clientId: 'windops-oauth-test', clientSecret: 'oauth-test-secret' } : undefined,
  );
  const service = buildApp({
    ready: async () => {},
    identity,
    authOrigin: origin,
    logger: false,
  });
  await service.ready();
  return service;
}

function headers(cookie) {
  return {
    host: new URL(origin).host,
    origin,
    ...(cookie ? { cookie } : {}),
  };
}

async function call(service, method, path, payload, cookie) {
  return service.inject({
    method,
    url: path,
    headers: headers(cookie),
    ...(payload === undefined ? {} : { payload }),
  });
}

function cookieFrom(response) {
  const raw = response.headers['set-cookie'];
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const session = values.filter((value) => /(?:__Secure-)?better-auth\.session_token=/.test(value));
  assert.ok(
    session.length,
    `sign-in must set the provider session cookie; received cookie names: ${values
      .map((value) => value.split('=', 1)[0])
      .join(', ')}`,
  );
  assert.ok(
    session.some((value) => /;\s*httponly\b/i.test(value)),
    'session cookies must be HttpOnly',
  );
  assert.ok(
    session.some((value) => /;\s*samesite=lax\b/i.test(value)),
    'session cookies must use SameSite=Lax',
  );
  return session.map((value) => value.split(';', 1)[0]).join('; ');
}

async function waitForMail(subject, recipient = email, timeoutMs = 12_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=100`);
    assert.equal(response.status, 200, 'Mailpit API must be available');
    const result = await response.json();
    const message = result.messages
      ?.filter(
        (entry) =>
          entry.Subject === subject &&
          !seenMailIds.has(entry.ID) &&
          JSON.stringify(entry.To).toLowerCase().includes(recipient.toLowerCase()),
      )
      .sort((left, right) => new Date(right.Created) - new Date(left.Created))[0];
    if (message) {
      trackedMailIds.add(message.ID);
      seenMailIds.add(message.ID);
      const detailResponse = await fetch(
        `${mailpitUrl}/api/v1/message/${encodeURIComponent(message.ID)}`,
      );
      assert.equal(detailResponse.status, 200, 'Mailpit message details must be readable');
      return detailResponse.json();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for test email with subject: ${subject}`);
}

function textBody(message) {
  return message.Text ?? message.text ?? '';
}

function parseSignupToken(message) {
  const link = textBody(message)
    .match(/https?:\/\/[^\s<>"']+/g)
    ?.map((candidate) => candidate.replace(/[),.]+$/, ''))
    .find((candidate) => candidate.includes('/cadastro/confirmar#token='));
  assert.ok(link, 'signup email must contain the one-time completion link');
  return new URL(link).hash.slice('#token='.length);
}

function parseResetLink(message) {
  const link = textBody(message)
    .match(/https?:\/\/[^\s<>"']+/g)
    ?.map((candidate) => candidate.replace(/[),.]+$/, ''))
    .find((candidate) => candidate.includes('/api/auth/reset-password/'));
  assert.ok(link, 'password reset email must contain the reset link');
  return new URL(link);
}

function parseCode(message) {
  const match = textBody(message).match(/\b\d{8}\b/);
  assert.ok(match, 'second-step email must contain an eight-digit code');
  return match[0];
}

const googleKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const googleJwk = {
  ...googleKeyPair.publicKey.export({ format: 'jwk' }),
  kid: 'windops-oauth-test-key',
  alg: 'RS256',
  use: 'sig',
};
let googleProfile;

function googleIdToken(nonce) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', typ: 'JWT', kid: googleJwk.kid });
  const payload = encode({
    iss: 'https://accounts.google.com',
    aud: 'windops-oauth-test',
    sub: googleProfile.sub,
    email: googleProfile.email,
    email_verified: googleProfile.emailVerified,
    name: 'Wind Ops OAuth Test',
    nonce,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  });
  const content = `${header}.${payload}`;
  return `${content}.${sign('RSA-SHA256', Buffer.from(content), googleKeyPair.privateKey).toString('base64url')}`;
}

function cookieHeader(response) {
  const raw = response.headers['set-cookie'];
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values.map((value) => value.split(';', 1)[0]).join('; ');
}

async function googleSignIn(service, profile, callbackURL = origin) {
  googleProfile = profile;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') {
      return Response.json(
        { keys: [googleJwk] },
        { headers: { 'cache-control': 'public, max-age=300' } },
      );
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      const form = new URLSearchParams(init?.body?.toString());
      assert.equal(form.get('client_id'), 'windops-oauth-test');
      assert.equal(form.get('redirect_uri'), `${origin}/api/auth/callback/google`);
      const authorizationUrl = googleProfile.authorizationUrl;
      return Response.json({
        access_token: 'oauth-integration-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid email profile',
        id_token: googleIdToken(authorizationUrl.searchParams.get('nonce')),
      });
    }
    return originalFetch(input, init);
  };

  try {
    const start = await call(service, 'POST', '/api/auth/sign-in/social', {
      provider: 'google',
      callbackURL,
      errorCallbackURL: origin,
      disableRedirect: true,
    });
    assert.equal(start.statusCode, 200, start.body);
    const authorizationUrl = new URL(start.json().url);
    assert.equal(authorizationUrl.origin, 'https://accounts.google.com');
    googleProfile.authorizationUrl = authorizationUrl;
    const callback = await service.inject({
      method: 'GET',
      url: `/api/auth/callback/google?code=oauth-test-code&state=${encodeURIComponent(authorizationUrl.searchParams.get('state'))}`,
      headers: {
        host: new URL(origin).host,
        cookie: cookieHeader(start),
      },
    });
    return { callback, cookie: cookieHeader(callback) };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function signIn(service, inputPassword = password) {
  const response = await call(service, 'POST', '/api/auth/sign-in/email', {
    email: email.toUpperCase(),
    password: inputPassword,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json(), { status: 'pending_email_second_step' });
  assert.equal(
    response.body.includes('token'),
    false,
    'sign-in response must not expose session tokens',
  );
  return {
    cookie: cookieFrom(response),
    message: await waitForMail('Seu código de acesso ao Wind Ops'),
  };
}

try {
  docker([...compose, 'exec', '-T', 'postgres', 'createdb', '-U', 'windops', database]);
  databaseCreated = true;
  provisionRoles();
  runMigrations();
  provisionRoles();
  pool = new Pool({ connectionString: connectionFor(process.env.DATABASE_URL), max: 4 });

  app = await startApp();
  const bypassSignup = await call(app, 'POST', '/api/auth/sign-up/email', {
    name: 'Blocked direct signup',
    email,
    password,
  });
  assert.equal(bypassSignup.statusCode, 403, 'direct Better Auth signup must stay blocked');
  const signup = await call(app, 'POST', '/api/auth/signup/email', { email: email.toUpperCase() });
  assert.equal(signup.statusCode, 200, signup.body);
  const signupMail = await waitForMail('Confirme seu e-mail para criar sua conta Wind Ops');
  const signupToken = parseSignupToken(signupMail);
  const completedSignup = await call(app, 'POST', '/api/auth/signup/complete', {
    token: signupToken,
    name: 'F04 Integration User',
    password,
  });
  assert.equal(completedSignup.statusCode, 200, completedSignup.body);
  const replaySignup = await call(app, 'POST', '/api/auth/signup/complete', {
    token: signupToken,
    name: 'F04 Integration User',
    password,
  });
  assert.equal(replaySignup.statusCode, 400, 'signup link must be single-use');
  const unverifiedSignIn = await call(app, 'POST', '/api/auth/sign-in/email', { email, password });
  assert.equal(unverifiedSignIn.statusCode, 200, 'confirmed signup should allow credential login');
  assert.deepEqual(unverifiedSignIn.json(), { status: 'pending_email_second_step' });
  await call(app, 'POST', '/api/auth/sign-out', {}, cookieFrom(unverifiedSignIn));
  const verified = await pool.query(
    'SELECT id, email, email_verified FROM public.auth_users WHERE email = $1',
    [email],
  );
  assert.equal(verified.rows.length, 1, 'email normalization must prevent duplicate case variants');
  assert.equal(verified.rows[0].email_verified, true);
  const existingEmailSignup = await call(app, 'POST', '/api/auth/signup/email', { email });
  assert.equal(existingEmailSignup.statusCode, signup.statusCode);
  assert.deepEqual(
    existingEmailSignup.json(),
    signup.json(),
    'signup start must not enumerate email',
  );
  const intentCount = await pool.query(
    'SELECT count(*)::int AS count FROM public.auth_signup_intents WHERE email = $1',
    [email],
  );
  assert.equal(intentCount.rows[0].count, 1, 'known accounts must not receive a new signup intent');

  const expiringEmail = `expiring-${process.pid}@example.invalid`;
  const expiringStart = await call(app, 'POST', '/api/auth/signup/email', { email: expiringEmail });
  assert.equal(expiringStart.statusCode, 200);
  const expiringMail = await waitForMail(
    'Confirme seu e-mail para criar sua conta Wind Ops',
    expiringEmail,
  );
  const expiringToken = parseSignupToken(expiringMail);
  await pool.query(
    "UPDATE public.auth_signup_intents SET expires_at = clock_timestamp() - interval '1 second' WHERE token_hash = $1",
    [createHash('sha256').update(expiringToken).digest()],
  );
  const expiredSignup = await call(app, 'POST', '/api/auth/signup/complete', {
    token: expiringToken,
    name: 'Expired Intent',
    password,
  });
  assert.equal(expiredSignup.statusCode, 400, 'expired signup link must be rejected');

  await app.close();
  app = await startApp(createEmailSender(env), true);
  const linkedGoogle = await googleSignIn(app, {
    sub: 'password-first-google-subject',
    email,
    emailVerified: true,
  });
  linkedGoogle.cookie = cookieFrom(linkedGoogle.callback);
  assert.equal(linkedGoogle.callback.statusCode, 302, linkedGoogle.callback.body);
  assert.ok(linkedGoogle.cookie.includes('better-auth.session_token'));
  const linkedAccount = await pool.query(
    `SELECT a.user_id, u.id AS expected_user_id
     FROM public.auth_accounts a
     JOIN public.auth_users u ON u.id = a.user_id
     WHERE a.provider_id = 'google' AND a.account_id = $1 AND u.email = $2`,
    ['password-first-google-subject', email],
  );
  assert.equal(
    linkedAccount.rows.length,
    1,
    'verified Google login must link to the verified password identity',
  );
  assert.equal(linkedAccount.rows[0].user_id, verified.rows[0].id);
  assert.equal(
    (await call(app, 'GET', '/api/auth/second-step/status', undefined, linkedGoogle.cookie)).json()
      .status,
    'pending_email_second_step',
    'a linked Google login must still require the email second step',
  );
  const linkedGoogleOtp = parseCode(await waitForMail('Seu código de acesso ao Wind Ops'));
  const linkedGoogleVerified = await call(
    app,
    'POST',
    '/api/auth/second-step/verify',
    { code: linkedGoogleOtp },
    linkedGoogle.cookie,
  );
  assert.equal(
    linkedGoogleVerified.statusCode,
    200,
    'Google login must complete the mandatory second step',
  );
  await call(app, 'POST', '/api/auth/sign-out', {}, linkedGoogle.cookie);

  const unverifiedGoogleEmail = `unverified-${email}`;
  const rejectedGoogle = await googleSignIn(app, {
    sub: 'unverified-google-subject',
    email: unverifiedGoogleEmail,
    emailVerified: false,
  });
  assert.notEqual(
    rejectedGoogle.callback.statusCode,
    302,
    'an unverified Google email must be rejected',
  );
  const unverifiedGoogleUser = await pool.query(
    'SELECT id FROM public.auth_users WHERE email = $1',
    [unverifiedGoogleEmail],
  );
  assert.equal(
    unverifiedGoogleUser.rows.length,
    0,
    'unverified Google email must not create an account',
  );
  assert.equal(
    (
      await pool.query(
        "SELECT id FROM public.auth_accounts WHERE provider_id = 'google' AND account_id = $1",
        ['unverified-google-subject'],
      )
    ).rows.length,
    0,
    'unverified Google email must not link an account',
  );

  const googleFirstEmail = `google-first-${process.pid}@example.invalid`;
  const googleFirst = await googleSignIn(
    app,
    {
      sub: 'google-first-subject',
      email: googleFirstEmail,
      emailVerified: true,
    },
    `${origin}/cadastro/perfil`,
  );
  googleFirst.cookie = cookieFrom(googleFirst.callback);
  assert.equal(googleFirst.callback.statusCode, 302, googleFirst.callback.body);
  const onboardingBeforeSetup = await call(
    app,
    'GET',
    '/api/auth/onboarding/status',
    undefined,
    googleFirst.cookie,
  );
  assert.deepEqual(onboardingBeforeSetup.json(), { status: 'needs_setup' });
  const googleSetup = await call(
    app,
    'POST',
    '/api/auth/signup/google/complete',
    { name: 'Google First Account', password: newPassword },
    googleFirst.cookie,
  );
  assert.equal(googleSetup.statusCode, 200, googleSetup.body);
  const onboardingAfterSetup = await call(
    app,
    'GET',
    '/api/auth/onboarding/status',
    undefined,
    googleFirst.cookie,
  );
  assert.deepEqual(onboardingAfterSetup.json(), { status: 'already_configured' });
  const googleFirstAccount = await pool.query(
    `SELECT id, name FROM public.auth_users u
     WHERE u.email = $1 AND EXISTS (
       SELECT 1 FROM public.auth_accounts a
       WHERE a.user_id = u.id AND a.provider_id = 'credential' AND a.password IS NOT NULL
     )`,
    [googleFirstEmail],
  );
  assert.equal(googleFirstAccount.rows.length, 1, 'Google onboarding must add a credential');
  assert.equal(googleFirstAccount.rows[0].name, 'Google First Account');
  const googleFirstOtp = parseCode(
    await waitForMail('Seu código de acesso ao Wind Ops', googleFirstEmail),
  );
  assert.equal(
    (
      await call(
        app,
        'POST',
        '/api/auth/second-step/verify',
        { code: googleFirstOtp },
        googleFirst.cookie,
      )
    ).statusCode,
    200,
  );
  const onboardingAfterSecondStep = await call(
    app,
    'GET',
    '/api/auth/onboarding/status',
    undefined,
    googleFirst.cookie,
  );
  assert.deepEqual(onboardingAfterSecondStep.json(), { status: 'already_configured' });
  await call(app, 'POST', '/api/auth/sign-out', {}, googleFirst.cookie);
  const passwordLoginAfterGoogle = await call(app, 'POST', '/api/auth/sign-in/email', {
    email: googleFirstEmail,
    password: newPassword,
  });
  assert.equal(passwordLoginAfterGoogle.statusCode, 200, passwordLoginAfterGoogle.body);
  assert.deepEqual(passwordLoginAfterGoogle.json(), { status: 'pending_email_second_step' });
  const passwordLoginCookie = cookieFrom(passwordLoginAfterGoogle);
  const passwordLoginOtp = parseCode(
    await waitForMail('Seu código de acesso ao Wind Ops', googleFirstEmail),
  );
  assert.equal(
    (
      await call(
        app,
        'POST',
        '/api/auth/second-step/verify',
        { code: passwordLoginOtp },
        passwordLoginCookie,
      )
    ).statusCode,
    200,
    'password sign-in after Google account creation must still require the second step',
  );
  await call(app, 'POST', '/api/auth/sign-out', {}, passwordLoginCookie);

  const anonymousReset = await call(app, 'POST', '/api/auth/request-password-reset', {
    email: `missing-${email}`,
    redirectTo: origin,
  });
  const existingReset = await call(app, 'POST', '/api/auth/request-password-reset', {
    email,
    redirectTo: origin,
  });
  assert.equal(anonymousReset.statusCode, 200);
  assert.equal(existingReset.statusCode, 200);
  assert.deepEqual(
    anonymousReset.json(),
    existingReset.json(),
    'password reset must not enumerate users',
  );

  await app.close();
  app = await startApp({
    async send() {
      throw new Error('mail transport secret detail');
    },
  });
  const deliveryFailure = await call(app, 'POST', '/api/auth/sign-in/email', { email, password });
  assert.equal(
    deliveryFailure.statusCode,
    500,
    'a failed challenge delivery must fail the sign-in request',
  );
  assert.equal(
    deliveryFailure.body.includes('secret detail'),
    false,
    'mail transport details must not leak',
  );
  const failedDeliverySessions = await pool.query(
    'SELECT count(*)::int AS count FROM public.auth_sessions WHERE user_id = $1',
    [verified.rows[0].id],
  );
  assert.equal(
    failedDeliverySessions.rows[0].count,
    0,
    'failed delivery must revoke its provisional session',
  );
  await app.close();
  app = await startApp();

  const { cookie, message: otpMessage } = await signIn(app);
  const rejectedOrigin = await app.inject({
    method: 'POST',
    url: '/api/auth/second-step/verify',
    headers: { host: new URL(origin).host },
    payload: { code: parseCode(otpMessage) },
  });
  assert.equal(rejectedOrigin.statusCode, 403, 'second-step mutations must enforce Origin');
  const untrustedOrigin = await app.inject({
    method: 'POST',
    url: '/api/auth/second-step/verify',
    headers: {
      host: new URL(origin).host,
      origin: 'https://attacker.example',
      cookie,
    },
    payload: { code: parseCode(otpMessage) },
  });
  assert.equal(
    untrustedOrigin.statusCode,
    403,
    'second-step mutations must reject foreign origins',
  );
  const pendingStatus = await call(app, 'GET', '/api/auth/second-step/status', undefined, cookie);
  assert.equal(pendingStatus.json().status, 'pending_email_second_step');
  assert.equal(
    'user' in pendingStatus.json(),
    false,
    'pending status must not disclose an authenticated identity',
  );
  const pendingSession = await call(app, 'GET', '/api/auth/get-session', undefined, cookie);
  assert.equal(pendingSession.json().status, 'pending_email_second_step');
  assert.equal(pendingSession.json().user, null);
  const blocked = await call(
    app,
    'POST',
    '/api/auth/update-user',
    { name: 'Unauthorized' },
    cookie,
  );
  assert.equal(
    blocked.statusCode,
    403,
    'pending sessions must not reach other Better Auth endpoints',
  );
  const cooldown = await call(app, 'POST', '/api/auth/second-step/resend', {}, cookie);
  assert.equal(cooldown.statusCode, 429, 'challenge resend must enforce its cooldown');

  const initialCode = parseCode(otpMessage);
  const pendingSessionRow = await pool.query(
    'SELECT id FROM public.auth_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [verified.rows[0].id],
  );
  await pool.query(
    `UPDATE public.auth_login_challenges
     SET sent_at = clock_timestamp() - interval '61 seconds'
     WHERE session_id = $1`,
    [pendingSessionRow.rows[0].id],
  );
  const resent = await call(app, 'POST', '/api/auth/second-step/resend', {}, cookie);
  assert.equal(resent.statusCode, 200, 'resend should work after its cooldown');
  const resentMessage = await waitForMail('Seu código de acesso ao Wind Ops');
  const firstResentCode = parseCode(resentMessage);
  assert.notEqual(firstResentCode, initialCode, 'resend must rotate the code');
  const oldCode = await call(
    app,
    'POST',
    '/api/auth/second-step/verify',
    { code: initialCode },
    cookie,
  );
  assert.equal(oldCode.statusCode, 400, 'the previous code must stop working after resend');
  const wrongCode = firstResentCode === '00000000' ? '11111111' : '00000000';
  const invalid = await call(
    app,
    'POST',
    '/api/auth/second-step/verify',
    { code: wrongCode },
    cookie,
  );
  assert.equal(invalid.statusCode, 400, 'an incorrect challenge must be rejected');

  await pool.query(
    `UPDATE public.auth_login_challenges
     SET sent_at = clock_timestamp() - interval '61 seconds'
     WHERE session_id = $1`,
    [pendingSessionRow.rows[0].id],
  );
  const secondResend = await call(app, 'POST', '/api/auth/second-step/resend', {}, cookie);
  assert.equal(secondResend.statusCode, 200);
  const code = parseCode(await waitForMail('Seu código de acesso ao Wind Ops'));
  assert.notEqual(code, firstResentCode, 'each resend must rotate the challenge');
  await pool.query(
    `UPDATE public.auth_login_challenges
     SET sent_at = clock_timestamp() - interval '61 seconds'
     WHERE session_id = $1`,
    [pendingSessionRow.rows[0].id],
  );
  const sendLimit = await call(app, 'POST', '/api/auth/second-step/resend', {}, cookie);
  assert.equal(sendLimit.statusCode, 429, 'fourth send within fifteen minutes must be blocked');

  await app.close();
  app = await startApp();
  const confirmations = await Promise.all([
    call(app, 'POST', '/api/auth/second-step/verify', { code }, cookie),
    call(app, 'POST', '/api/auth/second-step/verify', { code }, cookie),
  ]);
  assert.equal(confirmations.filter((response) => response.statusCode === 200).length, 1);
  assert.equal(confirmations.filter((response) => response.statusCode !== 200).length, 1);
  // A page that misses the successful OTP response can resume from this authoritative status.
  const authenticated = await call(app, 'GET', '/api/auth/second-step/status', undefined, cookie);
  assert.equal(authenticated.json().status, 'authenticated');
  assert.equal(authenticated.json().user.email, email);
  const safeSession = await call(app, 'GET', '/api/auth/get-session', undefined, cookie);
  assert.equal(safeSession.json().status, 'authenticated');
  assert.equal(JSON.stringify(safeSession.json()).includes('token'), false);
  const logout = await call(app, 'POST', '/api/auth/sign-out', {}, cookie);
  assert.equal(logout.statusCode, 200);
  assert.equal(
    (await call(app, 'GET', '/api/auth/second-step/status', undefined, cookie)).json().status,
    'anonymous',
    'logout must revoke the server session',
  );

  await pool.query('DELETE FROM public.auth_rate_limits');
  const expiringLogin = await signIn(app);
  const expiringSession = await pool.query(
    'SELECT id FROM public.auth_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [verified.rows[0].id],
  );
  await pool.query(
    `UPDATE public.auth_login_challenges
     SET expires_at = clock_timestamp() - interval '1 second'
     WHERE session_id = $1`,
    [expiringSession.rows[0].id],
  );
  const expiredChallenge = await call(
    app,
    'POST',
    '/api/auth/second-step/verify',
    { code: parseCode(expiringLogin.message) },
    expiringLogin.cookie,
  );
  assert.equal(expiredChallenge.statusCode, 400, 'expired codes must be rejected');
  assert.equal(
    (await call(app, 'GET', '/api/auth/second-step/status', undefined, expiringLogin.cookie)).json()
      .status,
    'anonymous',
    'expired challenges must revoke their provisional session',
  );

  const resetRequest = await call(app, 'POST', '/api/auth/request-password-reset', {
    email,
    redirectTo: origin,
  });
  assert.equal(resetRequest.statusCode, 200);
  const resetUrl = parseResetLink(await waitForMail('Redefina sua senha do Wind Ops'));
  const resetCallback = await app.inject({
    method: 'GET',
    url: `${resetUrl.pathname}${resetUrl.search}`,
    headers: { host: new URL(origin).host },
  });
  assert.equal(resetCallback.statusCode, 302);
  const resetToken = new URL(resetCallback.headers.location).searchParams.get('token');
  assert.ok(resetToken);
  const reset = await call(app, 'POST', '/api/auth/reset-password', {
    token: resetToken,
    newPassword,
  });
  assert.equal(reset.statusCode, 200, reset.body);
  const resetReplay = await call(app, 'POST', '/api/auth/reset-password', {
    token: resetToken,
    newPassword,
  });
  assert.equal(resetReplay.statusCode, 400, 'password reset tokens must be single-use');
  const revoked = await call(app, 'GET', '/api/auth/second-step/status', undefined, cookie);
  assert.equal(revoked.json().status, 'anonymous', 'password recovery must revoke old sessions');

  await pool.query('DELETE FROM public.auth_rate_limits');
  const relogin = await signIn(app, newPassword);
  await pool.query(
    "DELETE FROM public.auth_rate_limits WHERE key LIKE 'windops:second-step-verify-ip:%'",
  );
  const lockoutCode = parseCode(relogin.message);
  const invalidCodes = Array.from({ length: 5 }, (_, index) => String(index + 1).padStart(8, '0'))
    .filter((candidate) => candidate !== lockoutCode)
    .slice(0, 5);
  assert.equal(invalidCodes.length, 5);
  for (const badCode of invalidCodes) {
    const response = await call(
      app,
      'POST',
      '/api/auth/second-step/verify',
      { code: badCode },
      relogin.cookie,
    );
    assert.equal(response.statusCode, 400);
  }
  const lockedOut = await call(
    app,
    'GET',
    '/api/auth/second-step/status',
    undefined,
    relogin.cookie,
  );
  assert.equal(
    lockedOut.json().status,
    'anonymous',
    'five invalid codes must revoke the pending session',
  );

  const remainingSessions = await pool.query(
    'SELECT count(*)::int AS count FROM public.auth_sessions WHERE user_id = $1',
    [verified.rows[0].id],
  );
  assert.equal(
    remainingSessions.rows[0].count,
    0,
    'logout, password reset and lockout must remove active sessions',
  );
  console.log(
    'Auth integration passed: email verification, password and Google account linking, pending-session barrier, atomic OTP, restart, recovery and lockout.',
  );
} finally {
  if (app) await app.close();
  if (pool) await pool.end();
  if (databaseCreated)
    docker([
      ...compose,
      'exec',
      '-T',
      'postgres',
      'dropdb',
      '--if-exists',
      '-U',
      'windops',
      database,
    ]);
  for (const id of trackedMailIds) {
    await fetch(`${mailpitUrl}/api/v1/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }
}
