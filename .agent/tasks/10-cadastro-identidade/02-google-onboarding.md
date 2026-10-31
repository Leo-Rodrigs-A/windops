# O02 — Cadastro Google e onboarding

## Status

Concluída em 31/10/2026 para implementação e cobertura automatizada.

- [x] Task concluída

## Objetivo

Permitir OAuth Google a partir do cadastro e exigir nome/senha de toda conta Google cujo onboarding ainda não foi concluído, inclusive contas que já tenham workspace ou segunda etapa validada.

## Plano

- [x] Iniciar Google OAuth com callback dedicado `/cadastro/perfil`.
- [x] Manter email_verified obrigatório e rejeitar sessão/callback sem identidade Google verificada.
- [x] Expor estado de onboarding para sessão válida; conta Google verificada sem nome ou password deve completar o perfil, com ou sem workspace.
- [x] Redirecionar globalmente contas incompletas para `/cadastro/perfil` antes de liberar rotas do produto.
- [x] Preservar o segundo passo por e-mail antes de acesso ao app.
- [x] Cobrir fluxo Google simulado, password, nome e 2FA em integração auth.

## Contratos e dados

Usa Better Auth e endpoints same-origin; sem alteração de schema.

## Evidências

31/10/2026 — `POST /api/auth/signup/google/complete` exige Origin confiável, sessão Google verificada e perfil incompleto; pode concluir antes ou depois da segunda etapa. `GET /api/auth/onboarding/status` verifica Google, nome e password, sem depender de workspace. AuthProvider aplica o redirect para contas `needs_setup` tanto em `authenticated` quanto `orphan`. `pnpm test:auth-integration` afirma estados `needs_setup` e `already_configured`; callback Google real no browser fica em O04.
