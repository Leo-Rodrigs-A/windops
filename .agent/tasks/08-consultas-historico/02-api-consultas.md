# Q02 — Consultas paginadas e autorização

## Status

Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Garantir que as consultas existentes sustentem filtros combinados e várias páginas nas três listas, com comportamento definido durante transições concorrentes.

## Escopo e exclusões

GETs de issues, contratos e testes do módulo existente. Não reimplementar CRUD, criar módulo de relatórios, ampliar Electric ou trocar o cursor por um novo protocolo sem necessidade.

## Estado atual

`issues/service.ts` filtra por workspace/status/P/T, resolve cursor pelo registro dentro do mesmo filtro e ordena data/ID de forma descendente. Se o registro sair do filtro, retorna `INVALID_CURSOR`. Integração atual cobre duas páginas pequenas, filtros, equipamentos arquivados e isolamento; falta a matriz combinada e concorrente desta slice.

## Dependências

[Q01](01-regras-consulta.md).

## Plano

- [x] Estender fixtures descartáveis com mais de 25 issues, dois parques, turbinas de mesmo código em parques diferentes, datas de criação/conclusão/arquivo distintas e empates. Não inserir massa no workspace do proprietário.
- [x] Exercitar `active`, `pending`, `in_progress`, `completed` e `archived`, com P/T isolados e combinados; conferir todas as páginas e esgotamento do cursor. Corrigir apenas inconsistências demonstradas.
- [x] Manter filtro tenant na leitura e na resolução do cursor, sessão completa e membership ativa em toda chamada. Testar revogação entre páginas, tenant externo e combinações inexistentes/incompatíveis sem revelar sua existência.
- [x] Cobrir saída do cursor por conclusão, arquivo, reabertura ou mudança de localização; preservar resposta `400 INVALID_CURSOR`. Documentar ao cliente que deve atualizar a lista, sem loop de retries ou continuação de cursor antigo.
- [x] Confirmar ordenação das concluídas pela atualização de conclusão e das arquivadas pelo arquivo; não reordenar por criação no cliente. Testar empate e entradas novas entre páginas, distinguindo paginação de snapshot histórico.
- [x] Inspecionar planos das consultas com fixture representativa. Só adicionar índice/migration se existir necessidade demonstrada; nesse caso sincronizar Drizzle/SQL e validar instalação/upgrade/grants/restore. Ausência de migration não bloqueia esta task.
- [x] Rodar `pnpm check` e `pnpm test:issues-integration`; registrar resultados, limitações e eventual alteração de contrato.

## Contratos e dados afetados

`packages/contracts/src/index.ts`, rotas/serviço de issues e `apps/api/scripts/issues-read-flow.mjs`. Preservar limites, DTO e erros documentados, sem importar schema/repositório de outro módulo. Não aplicar migração ao banco dev implicitamente.

## Testes e aceite

Fixture paginada retorna exatamente os IDs esperados em cada filtro, sem repetição em conjunto estável; cursores inválidos e tenant externo têm respostas seguras. Transição concorrente produz a recuperação definida em Q01. Consultas não alteram issues, eventos, notificações ou recibos.

## Evidências

28/10/2026 — Task planejada; testes existentes foram lidos, mas a nova matriz não foi executada. Nenhuma migration prevista nesta preparação.


30/10/2026 — Implementada matriz reutilizável em `apps/api/scripts/issues-query-matrix.mjs`, chamada pelo harness descartável `issues-read-flow.mjs`: 128 issues, dois parques com T01, cinco estados de consulta e seis combinações de localização por estado, paginação até esgotar, empates com microssegundos e ordem de conclusão diferente da criação. Verifica ausência de efeitos de leitura em issues/eventos/recibos/notificações, sessão incompleta, tenant externo, cursor inexistente/externo, revogação entre páginas e nova entrada no topo durante continuação. Transições por SQL na fixture simulam conclusão, arquivo, reabertura e transferência entre requisições; endpoints reais de lifecycle continuam cobertos pelo harness existente.

Corrigida perda de precisão no cursor: `pg` convertia timestamp em `Date`, truncando microssegundos antes da comparação da página seguinte. A consulta agora retorna timestamp como texto interno e mantém comparação `timestamptz` no PostgreSQL. Cursor público UUID, DTO, limites e autorização permanecem iguais. O cliente deve reiniciar após `400 INVALID_CURSOR`, com a tentativa limitada definida na Q01; implementação da recuperação e ordenação local permanece em Q04/Q03.

`pnpm test:issues-integration` aprovado em banco descartável, removido pelo harness; primeira tentativa bloqueada pelo sandbox Docker e repetida com aprovação. `pnpm check` aprovado (54 testes, lint/boundaries, typechecks e builds); primeira execução apontou formatação das tabelas Markdown Q01/índice, corrigida antes do sucesso. `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` das consultas reais active/completed/archived com parque usou `issues_workspace_location_status_idx` e ordenação em memória (29–32 KiB), execução 0,115–0,168 ms nessa fixture. Sem evidência para novo índice; não é benchmark de produção nem garantia em volumes maiores. Sem migration, escrita no banco operacional ou validação visual/móvel. `git diff --check` aprovado. Próxima: Q03.
