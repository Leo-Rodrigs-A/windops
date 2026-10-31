# O01 — Intenção de cadastro e prova de e-mail

## Status

Concluída em 31/10/2026.

- [x] Task concluída

## Objetivo

Permitir que a pessoa informe somente o e-mail, receba um link de verificação e defina perfil/senha após provar controle do endereço.

## Plano

- [x] Migration para intents com e-mail normalizado, token hash, expiração, consumo e rate limits; índices/constraints e grants mínimos.
- [x] Serviço de identidade em transação: emitir intent sem enumerar conta, invalidar anteriores, enviar link após commit e consumir token uma única vez.
- [x] Concluir cadastro via intent: criar credencial com API Better Auth após prova de e-mail; endpoint público direto de sign-up bloqueado.
- [x] Registrar expirados sem permitir consumo e não apagar contas/memberships existentes.
- [x] Testar token expirado/replay, e-mail existente/anti-enumeração, bloqueio do endpoint direto, login posterior e segunda etapa.
- [x] Validar migration vazia/upgrade/grants e integração auth.

## Aceite

Nenhuma conta/login antes de link válido; token nunca armazenado em claro; replay/cruzamento de e-mail rejeitados; resposta pública não revela existência de conta; envio externo após commit.

## Evidências

31/10/2026 — `0013_signup_intents` cria tokens de uso único com hash SHA-256, expiração de 30 minutos, rate limit por IP/e-mail e consumo sob lock. O link usa fragmento, evitando envio do token ao servidor na navegação. O endpoint final cria a conta pelo `auth.api.signUpEmail`, confirma `email_verified` e consome o intent; chamadas diretas a `/api/auth/sign-up/email` são bloqueadas. `pnpm test:auth-integration` cobre signup, token expirado/replay, anti-enumeração, OAuth/vínculo e segunda etapa. `pnpm db:empty-check`, `pnpm db:permissions` e `drizzle-kit check` passaram; migration aplicada ao banco dev. Envio de link ocorre depois do commit; falha permite reenvio, que invalida intent anterior. SMTP falhando especificamente no envio do link de cadastro não teve ensaio dedicado; Mailpit e falha de entrega do OTP estão cobertos.
