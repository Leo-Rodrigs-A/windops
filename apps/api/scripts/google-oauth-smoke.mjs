import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createIdentityProvider } from '../src/modules/identity/index.ts';
import { parseEnvironment } from '../src/platform/config.ts';
import { createEmailSender } from '../src/platform/email.ts';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
config({ path: `${projectRoot}/.env`, quiet: true });
const env = parseEnvironment(process.env);
assert.ok(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  'Google OAuth credentials are required.',
);
assert.ok(env.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET is required.');
assert.ok(env.SMTP_URL, 'SMTP_URL is required.');

const database = `windops_google_smoke_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml'];
const pagePath = `${projectRoot}/apps/web/public/google-auth-smoke.html`;
const pageDirectory = `${projectRoot}/apps/web/public`;
let databaseCreated = false;
let pageCreated = false;
let pool;
let app;

function docker(args) {
  execFileSync('docker', args, { cwd: projectRoot, stdio: 'inherit' });
}

function connectionFor(urlString) {
  const url = new URL(urlString);
  url.pathname = `/${database}`;
  return url.toString();
}

function writeSmokePage() {
  if (existsSync(pagePath)) throw new Error('Temporary Google smoke page already exists.');
  mkdirSync(pageDirectory, { recursive: true });
  writeFileSync(
    pagePath,
    `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Teste local Google OAuth — Wind Ops</title>
<main style="font:16px system-ui;max-width:36rem;margin:3rem auto;padding:1rem">
  <h1>Teste local do Google OAuth</h1>
  <p>Esta página é temporária e existe apenas durante o teste local.</p>
  <button id="google" type="button">Entrar com Google</button>
  <p id="state" role="status">Verificando sessão…</p>
  <form id="verify" hidden>
    <label>Código recebido por e-mail <input name="code" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required></label>
    <button type="submit">Confirmar código</button>
  </form>
</main>
<script type="module">
const state = document.querySelector('#state');
const verify = document.querySelector('#verify');
async function refresh() {
  const result = await fetch('/api/auth/second-step/status', { credentials: 'same-origin' });
  const data = await result.json();
  if (data.status === 'pending_email_second_step') {
    state.textContent = 'Sessão Google pendente. Confira o código no Mailpit.';
    verify.hidden = false;
  } else if (data.status === 'authenticated') {
    state.textContent = ['Segunda etapa concluída para ', data.user.email, '.'].join('');
    verify.hidden = true;
  } else {
    state.textContent = 'Sessão anônima. Inicie o teste Google.';
  }
}
document.querySelector('#google').addEventListener('click', async () => {
  const response = await fetch('/api/auth/sign-in/social', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'google', callbackURL: location.href, errorCallbackURL: location.href }),
  });
  const data = await response.json();
  if (!response.ok || !data.url) { state.textContent = 'Não foi possível iniciar o fluxo Google.'; return; }
  location.assign(data.url);
});
verify.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = new FormData(verify).get('code');
  const response = await fetch('/api/auth/second-step/verify', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) { state.textContent = 'Código inválido ou expirado.'; return; }
  await refresh();
});
refresh().catch(() => { state.textContent = 'API local indisponível.'; });
</script></html>\n`,
    { mode: 0o600 },
  );
  pageCreated = true;
}

try {
  docker([...compose, 'exec', '-T', 'postgres', 'createdb', '-U', 'windops', database]);
  databaseCreated = true;
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
  execFileSync('./apps/api/node_modules/.bin/tsx', ['apps/api/src/platform/database/migrate.ts'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: connectionFor(process.env.MIGRATION_DATABASE_URL),
    },
    stdio: 'inherit',
  });
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

  pool = new Pool({ connectionString: connectionFor(env.DATABASE_URL), max: 4 });
  const identity = createIdentityProvider(
    pool,
    env.APP_ORIGIN,
    env.BETTER_AUTH_SECRET,
    createEmailSender(env),
    {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  );
  app = buildApp({
    ready: async () => {},
    identity,
    authOrigin: env.APP_ORIGIN,
    logger: false,
  });
  await app.listen({ host: '127.0.0.1', port: env.PORT });
  writeSmokePage();
  console.log(`Temporary Google OAuth test ready at ${env.APP_ORIGIN}/google-auth-smoke.html`);
  console.log(
    'Use the Mailpit UI for the second-step code; stop this process with Ctrl+C when finished.',
  );
  await new Promise((resolve) => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
} finally {
  if (app) await app.close().catch(() => undefined);
  if (pool) await pool.end().catch(() => undefined);
  if (pageCreated) rmSync(pagePath, { force: true });
  if (pageCreated && existsSync(pageDirectory) && readdirSync(pageDirectory).length === 0) {
    rmSync(pageDirectory, { recursive: false });
  }
  if (databaseCreated) {
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
  }
}
