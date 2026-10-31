# R08 — Revisão funcional, segurança e aceite integrado

## Status

Planejada; depende de R07.

- [ ] Task concluída

## Objetivo

Demonstrar que os achados conhecidos A01–A13 foram corrigidos ou receberam decisão explícita e que os invariantes continuam íntegros.

## Escopo e exclusões

Revisão do inventário e testes integrados automatizados/manual guiado em browser. Sem pentest certificado, produção, validação física móvel ou afirmar ausência absoluta de defeitos.

## Estado atual

Baseline R01 contém inventário e matriz de regressão; R01A–R07 deverão anexar evidências por comportamento. R07 concluiu `pnpm check` (81 testes/builds) e 27 testes offline direcionados: restart/upgrade v1→v2, partições, quota simulada, retry/ACK perdido, conflito, tombstone e pruning com pendências. Esses testes usam fake-indexeddb; quota física, eviction do navegador e aparelho móvel seguem sem evidência e devem ser registrados como limites, não como falhas automatizadas.

## Dependências

R01–R07 concluídas; Q05 aceita em Chrome/Edge.

## Plano

- [ ] Atualizar estado e evidência de cada item A01–A13, linkando mudança e teste; nenhum item sem dono/decisão.
- [ ] Rodar `pnpm check` e integrações auth, workspaces, parks e issues em bancos descartáveis.
- [ ] Revalidar segunda etapa/vínculo, tenant/revogação/último admin, catálogo/lifecycle/hora/idempotência/audit/outbox e cursores/filtros.
- [ ] Revalidar journal/restart/retry/conflito/quota simulada/poda/exportação/partição e worker/service worker conforme cobertura afetada.
- [ ] Consolidar evidências R07 sem alegar quota física, eviction real ou validação móvel; apontar exatamente as suites já executadas para evitar lacuna ou afirmação excessiva.
- [ ] Fazer inspeção funcional Chrome/Edge para cargos, erros/parcial/offline, teclado/foco, tema e larguras; identificar confirmação automatizada versus manual.
- [ ] Verificar logs, links/instruções, dados operacionais, limpeza de recursos temporários e `git diff --check`.
- [ ] Atualizar baseline, memória, índice e limites; fechar slice apenas se achados altos resolvidos e médios/baixos corrigidos ou explicitamente aceitos com destino.

## Contratos e dados afetados

Somente cobertura, evidências e documentação, salvo correções de regressão que retornam à task responsável.

## Testes e aceite

Matriz auth/tenant, transações, UI, sincronização e offline aprovada; falhas registradas sem mascarar; nenhum uso de DB operacional para fixtures descartáveis.

## Evidências

Plano criado para fechamento A01–A13; execução não iniciada.
