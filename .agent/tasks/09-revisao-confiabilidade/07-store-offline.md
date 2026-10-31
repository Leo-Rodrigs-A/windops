# R07 — Store offline

## Status

Planejada; depende de R06.

- [ ] Task concluída

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

- [ ] Inventariar stores, versões de journal, callers e atomicidade de `commitRows`/poda.
- [ ] Registrar fixtures pré-refactor para journal v1/v2, partições, revisão mínima, fila e recursos pendentes.
- [ ] Extrair uma responsabilidade por vez mantendo a facade pública e o mesmo commit IndexedDB.
- [ ] Preservar precedência de revisão API/réplica/ACK, saída de shape, tombstone, cursor, retenção, dependências e exportação.
- [ ] Testar restart/upgrade, quota abortada, ACK perdido/retry, conflito, account/workspace isolation e pruning com pendências.
- [ ] Executar `pnpm check` e IndexedDB proof; não inferir persistência durável de estado otimista.
- [ ] Documentar arquivos/fachada final e detalhar matriz R08 incluindo exclusões aceitas.

## Contratos e dados afetados

Organização interna; formato e versão do journal permanecem compatíveis. Sem alteração de schema.

## Testes e aceite

Restart/retry/conflito/partição/exportação e atomicidade passam com dados anteriores ao refactor e sem perda de comandos pendentes.

## Evidências

Plano criado para A11/A12; implementação não iniciada.
