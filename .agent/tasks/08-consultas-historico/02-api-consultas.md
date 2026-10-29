# Q02 — Consultas paginadas e autorização

## Status

Planejada.

- [ ] Task concluída

## Objetivo

Garantir que as consultas existentes sustentem filtros combinados e várias páginas nas três listas, com comportamento definido durante transições concorrentes.

## Escopo e exclusões

GETs de issues, contratos e testes do módulo existente. Não reimplementar CRUD, criar módulo de relatórios, ampliar Electric ou trocar o cursor por um novo protocolo sem necessidade.

## Estado atual

`issues/service.ts` filtra por workspace/status/P/T, resolve cursor pelo registro dentro do mesmo filtro e ordena data/ID de forma descendente. Se o registro sair do filtro, retorna `INVALID_CURSOR`. Integração atual cobre duas páginas pequenas, filtros, equipamentos arquivados e isolamento; falta a matriz combinada e concorrente desta slice.

## Dependências

[Q01](01-regras-consulta.md).

## Plano

- [ ] Estender fixtures descartáveis com mais de 25 issues, dois parques, turbinas de mesmo código em parques diferentes, datas de criação/conclusão/arquivo distintas e empates. Não inserir massa no workspace do proprietário.
- [ ] Exercitar `active`, `pending`, `in_progress`, `completed` e `archived`, com P/T isolados e combinados; conferir todas as páginas e esgotamento do cursor. Corrigir apenas inconsistências demonstradas.
- [ ] Manter filtro tenant na leitura e na resolução do cursor, sessão completa e membership ativa em toda chamada. Testar revogação entre páginas, tenant externo e combinações inexistentes/incompatíveis sem revelar sua existência.
- [ ] Cobrir saída do cursor por conclusão, arquivo, reabertura ou mudança de localização; preservar resposta `400 INVALID_CURSOR`. Documentar ao cliente que deve atualizar a lista, sem loop de retries ou continuação de cursor antigo.
- [ ] Confirmar ordenação das concluídas pela atualização de conclusão e das arquivadas pelo arquivo; não reordenar por criação no cliente. Testar empate e entradas novas entre páginas, distinguindo paginação de snapshot histórico.
- [ ] Inspecionar planos das consultas com fixture representativa. Só adicionar índice/migration se existir necessidade demonstrada; nesse caso sincronizar Drizzle/SQL e validar instalação/upgrade/grants/restore. Ausência de migration não bloqueia esta task.
- [ ] Rodar `pnpm check` e `pnpm test:issues-integration`; registrar resultados, limitações e eventual alteração de contrato.

## Contratos e dados afetados

`packages/contracts/src/index.ts`, rotas/serviço de issues e `apps/api/scripts/issues-read-flow.mjs`. Preservar limites, DTO e erros documentados, sem importar schema/repositório de outro módulo. Não aplicar migração ao banco dev implicitamente.

## Testes e aceite

Fixture paginada retorna exatamente os IDs esperados em cada filtro, sem repetição em conjunto estável; cursores inválidos e tenant externo têm respostas seguras. Transição concorrente produz a recuperação definida em Q01. Consultas não alteram issues, eventos, notificações ou recibos.

## Evidências

28/10/2026 — Task planejada; testes existentes foram lidos, mas a nova matriz não foi executada. Nenhuma migration prevista nesta preparação.
