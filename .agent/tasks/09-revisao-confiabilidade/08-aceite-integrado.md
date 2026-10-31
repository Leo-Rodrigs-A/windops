# R08 — Revisão funcional, segurança e aceite integrado

## Status

Concluída em 30/10/2026; dependeu de R07, concluída.

- [x] Task concluída

## Objetivo

Demonstrar que os achados conhecidos A01–A13 foram corrigidos ou receberam decisão explícita e que os invariantes continuam íntegros.

## Escopo e exclusões

Revisão do inventário e testes integrados automatizados/manual guiado em browser. Sem pentest certificado, produção, validação física móvel ou afirmar ausência absoluta de defeitos.

## Estado atual

Baseline R01 contém o inventário; R01A–R07 anexaram evidências por comportamento. O fechamento item a item de A01–A13 está na [matriz R08](baseline-r01.md). R07 concluiu `pnpm check` (81 testes/builds) e 27 testes offline direcionados: restart/upgrade v1→v2, partições, quota simulada, retry/ACK perdido, conflito, tombstone e pruning com pendências. Esses testes usam fake-indexeddb; quota física, eviction do navegador e aparelho móvel seguem sem evidência e são limites registrados.

## Dependências

R01–R07 concluídas; Q05 aceita em Chrome/Edge.

## Plano

- [x] Atualizar estado e evidência de cada item A01–A13, linkando mudança e teste; nenhum item sem dono/decisão.
- [x] Rodar `pnpm check` e integrações auth, workspaces, parks e issues em bancos descartáveis.
- [x] Revalidar segunda etapa/vínculo, tenant/revogação/último admin, catálogo/lifecycle/hora/idempotência/audit/outbox e cursores/filtros.
- [x] Revalidar journal/restart/retry/conflito/quota simulada/poda/exportação/partição e worker/service worker conforme cobertura afetada.
- [x] Consolidar evidências R07 sem alegar quota física, eviction real ou validação móvel; apontar exatamente as suites já executadas para evitar lacuna ou afirmação excessiva.
- [x] Reutilizar o aceite funcional Chrome/Edge reportado pelo proprietário em Q05/R06 (cargos, estados, filtros, erros/parcial/offline, teclado/foco, tema e responsividade); não atribuí-lo a observação direta nesta execução.
- [x] Verificar logs/instruções e scripts de integração: testes usam bancos descartáveis e fazem cleanup em `finally`; nenhuma fixture foi dirigida ao banco operacional. `git diff --check` passou.
- [x] Atualizar baseline, memória, índice e limites; os achados altos foram resolvidos, os demais têm correção ou destino explícito.

## Contratos e dados afetados

Somente cobertura, evidências e documentação, salvo correções de regressão que retornam à task responsável.

## Testes e aceite

Matriz auth/tenant, transações, UI, sincronização e offline aprovada; falhas registradas sem mascarar; nenhum uso de DB operacional para fixtures descartáveis.

## Evidências

30/10/2026: `pnpm check` passou (lint/boundaries, typecheck, 16 arquivos/81 testes e builds de contracts/API/web). `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:parks-integration` e `pnpm test:issues-integration` passaram em PostgreSQL descartável. Cobriram segunda etapa e vínculo (Google simulado), recuperação/lockout, OTP, convite/expiração/rate limit, promoção/revogação/tenant/último admin, catálogo e conflitos concorrentes, lifecycle, autorização, cursores/filtros, recibos, audit/outbox e worker push/retry. Mensagens de bootstrap inválido e usuário ausente na recuperação são negativas esperadas.

O proprietário já havia confirmado o aceite funcional em Chrome/Edge após R06 e Q05, incluindo cargos, estados, UI, offline/reabertura/sincronização e responsividade; esta confirmação não é observação direta desta execução. O repositório não tem Playwright/E2E real automatizado; a cobertura tem unit tests, integrações PostgreSQL e confirmação manual registrada. Não foi repetido OAuth real nem Browser MCP.

Sem alteração de fonte, schema ou infraestrutura em R08. Scripts de integração mantêm cleanup `finally` para bancos descartáveis; migrations/restore/permissions de infraestrutura não se aplicam a esta task. `git diff --check` passou. Limites transferidos ao roadmap 11: quota/eviction física, dispositivos móveis, HTTPS/produção. Google real e serviço externo de e-mail/push não foram exercitados aqui.
