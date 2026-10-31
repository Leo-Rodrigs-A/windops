# R07 — Store offline

## Status

Concluída em 30/10/2026; dependeu de R06, concluída.

- [x] Task concluída

## Objetivo

Separar responsabilidades da store offline sem dividir commits nem alterar o journal persistido.

## Escopo e exclusões

Mapear `LocalIssueStore` em persistência, projeções/reconciliação e fila/comandos; preservar facade consumida pela UI. Sem migration/schema incompatível ou nova camada genérica.

## Estado atual

Baseline A11/A12 descreve store com cerca de 1.210 linhas e `commitRows` combinando projeção e retenção transacional. Já existem provas IndexedDB, tests de quota, retry, conflito e exportação.

Consumidores da store após R06: `features/issues/issue-list-pages.tsx`, `issue-detail-page.tsx` e `issue-history-page.tsx` leem projeções/replicas e comandos; `features/issues/model.ts` monta a projeção para a interface; `features/parks/use-parks-catalog.ts` valida e lê réplicas de parks/turbines. `OfflineWorkspaceProvider` continua dono do lifecycle e facade compartilhada. Preservar assinaturas públicas desses callers enquanto a store for extraída; não mover comandos ou estado entre conta/workspace.

## Dependências

R06 concluída; regressão atual de Q03/S09 como baseline.

## Plano

- [x] Inventariar stores, versões de journal, callers e atomicidade de `commitRows`/poda.
- [x] Usar a regressão persistida existente para journal v1/v2, partições, revisão mínima, fila e recursos pendentes; os dados v1 são criados pelo teste de upgrade.
- [x] Extrair persistência/retenção, reconciliação e fila mantendo a facade pública e o mesmo commit IndexedDB.
- [x] Preservar precedência de revisão API/réplica/ACK, saída de shape, tombstone, cursor, retenção, dependências e exportação.
- [x] Validar restart/upgrade, quota abortada, ACK perdido/retry, conflito, account/workspace isolation e pruning com pendências.
- [x] Executar `pnpm check` e IndexedDB proof; nenhuma garantia de persistência durável foi inferida de estado otimista.
- [x] Documentar arquivos/fachada e transferir a matriz de aceite integrado para R08.

## Contratos e dados afetados

Organização interna; formato e versão do journal permanecem compatíveis. Sem alteração de schema.

## Testes e aceite

Restart/retry/conflito/partição/exportação e atomicidade passam com dados anteriores ao refactor e sem perda de comandos pendentes.

## Evidências

30/10/2026: `LocalIssueStore` manteve sua fachada em `local-issue-store.ts`; os tipos do journal foram movidos para `local-issue-store/types.ts`, retenção pura para `retention.ts`, criação/commit transacional para `persistence.ts`, reconciliação de revisão/ACK/tombstone para `reconciliation.ts` e seleção/retry/criação de comandos para `command-queue.ts`. Poda e escrita continuam no mesmo `createTransaction` e no mesmo journal IndexedDB. DB permanece v2; formato de export permanece v1; sem migration ou alteração de contrato.

`pnpm check` passou: lint/boundaries, typecheck, 81 testes e builds de contracts/API/web. Execução explícita das provas offline (`indexed-db-proof.test.ts`, `local-issue-store.test.ts`, `workspace-replica.test.ts`, `command-sender.test.ts`) passou: 4 arquivos/27 testes. Evidências cobrem restart, upgrade v1→v2, isolamento por conta/workspace, falha de quota sem gravação parcial, retry após ACK perdido, revisão/ conflito, tombstone e proteção de comandos durante pruning. O harness IndexedDB usa fake-indexeddb e a quota é simulada; quota/evicção física e navegadores móveis seguem fora desta prova.
