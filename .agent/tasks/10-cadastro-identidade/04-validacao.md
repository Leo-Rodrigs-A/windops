# O04 — Validação integrada e aceite manual

## Status

Em andamento; validação automatizada aprovada em 31/10/2026; Google real validado pelo proprietário em 30/10/2026; demais itens manuais abaixo ainda pendentes.

- [ ] Task concluída

## Plano

- [x] `pnpm check` (lint, typecheck, testes e build).
- [x] `pnpm test:auth-integration` contra PostgreSQL/Mailpit descartáveis: signup por intent, expiração, replay, anti-enumeração, OAuth simulado, vínculo, senha, onboarding pendente/concluído e segunda etapa.
- [x] `pnpm db:empty-check`, `pnpm db:permissions` e `drizzle-kit check`; migration 0013 aplicada ao banco de desenvolvimento.
- [x] Confirmar ambiente ativo por `GET /api/auth/providers` retornando `{"google":true}`.
- [x] Validar Google real no browser: proprietário confirmou que foi validado e está funcionando perfeitamente.
- [ ] Validar cadastro por e-mail → caixa postal → link → nome/senha → login por senha → OTP; confirmar entrada posterior por ambos os métodos na mesma conta.
- [ ] Confirmar que tentativas de criar e-mail já existente mostram estado neutro e que a conta continua podendo entrar.

## Limitações

O ensaio Google da integração usa provedor simulado. O aceite do Google real foi confirmado pelo proprietário em 30/10/2026; isso supera a pendência histórica do callback, sem representar observação direta pelo agente ou validação no domínio de produção. A porta 5173 estava ocupada por Preview; nenhum processo em uso foi encerrado ou substituído.

## Evidências

31/10/2026 — Checks automatizados e resposta `google: true` confirmados. Aceite manual ainda não realizado.

31/10/2026 — Requisito do proprietário: qualquer conta Google sem nome ou password deve ser encaminhada ao onboarding, com ou sem workspace e mesmo após a segunda etapa. `pnpm check` passou (61 testes e builds); `pnpm test:auth-integration` passou incluindo a consulta do estado antes/depois do setup. O ensaio de callback Google real e navegação em browser permanece pendente.

30/10/2026 — Atualização nesta conversa: proprietário informou que o Google foi validado e funciona perfeitamente; item de Google real concluído por aceite informado. Cadastro por e-mail, entrada pelos dois métodos na mesma conta e resposta a e-mail existente não foram explicitamente confirmados nesta mensagem; permanecem abertos. Registros anteriores são históricos. Nenhum teste repetido nesta atualização documental.
