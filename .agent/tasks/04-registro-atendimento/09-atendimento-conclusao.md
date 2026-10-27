# I09 — Autoatendimento com espera e conclusão online

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Impedir que o autor inicie o próprio chamado antes de uma hora, permitir a conclusão auditável pelo responsável e ordenar histórico e chamados concluídos do mais recente para o mais antigo.

## Estado atual

O proprietário reportou que técnico conseguia iniciar o próprio chamado imediatamente e não havia ação para concluir. Também confirmou que os logs do detalhe e a lista de concluídas devem exibir primeiro os itens recentes. API, contrato, migração, UI e integração estão implementados.

## Dependências

I03–I07 concluídas tecnicamente. Ver [índice da slice](README.md).

## Escopo e exclusões

Regra server-side de espera de uma hora desde `created_at` para o próprio autor iniciar; outros membros ativos podem iniciar imediatamente. Conclusão online pelo responsável atual com relato opcional; histórico imutável, recibo idempotente e estado `completed`. Concluídas ficam no Histórico em ordem decrescente; Home continua apenas com Pendentes/Em andamento e ordenação antiga primeiro. Reabertura, arquivo/restauração de issues e relato offline permanecem fora desta task.

## Plano de implementação

- [x] Aplicar a espera no relógio do banco e comunicar a negativa específica; refletir o limite na UI sem confiar no relógio do cliente.
- [x] Acrescentar contrato, migration compatível, endpoint de conclusão, snapshot de relato/status, evento e recibo na mesma transação.
- [x] Expor ação de concluir apenas ao responsável atual e listar concluídas no Histórico; filtrar Home para estados abertos.
- [x] Apresentar aviso e relato opcional em modal do app, sem diálogos nativos do navegador; manter relato e chave estáveis em retry.
- [x] Ordenar eventos recentes primeiro com cursor keyset para eventos anteriores; concluídas recentes primeiro, mantendo ordem operacional da Home.
- [x] Validar matriz ator/autor, limite de uma hora, conclusão/replay, edição negada após concluir, ordenação paginada e migration em instalação vazia e upgrade.
- [x] Atualizar evidências, memória, database, roadmap e índices após validação.

## Contratos e dados afetados

`IssueStatus` adiciona `completed`; `Issue` inclui `completionReport`; `IssueEventType` adiciona `completed`; lista aceita filtro `active`. Migration `0007_tidy_magdalene` acrescenta `completion_report` e amplia checks compatíveis com registros existentes. Atualizar `.agent/database.md` com permissões, estado, migration, filtros e ordenação. Todos os comandos preservam autorização tenant, expectedRevision, transação e idempotência.

## Testes e aceite

- [x] Autor recebe negativa antes de 1h; outro membro pode iniciar imediatamente; autor pode iniciar no limite após 1h.
- [x] Somente responsável conclui; relato opcional persiste; comando repetido não duplica evento e edição posterior é negada.
- [x] Concluídas e eventos aparecem recentes primeiro com paginação estável; Home exclui concluídas.
- [x] Migration aplicada em banco temporário vazio e upgrade no dev; Biome, typecheck, build, Vitest e integração registrados.

## Evidências

26/10/2026: API, contratos, migration `0007_tidy_magdalene`, UI e Histórico implementados. Integração `node --import tsx apps/api/scripts/issues-read-flow.mjs` passou em PostgreSQL descartável: nega autoatendimento antes da hora, permite colega imediato e autor após uma hora, confirma conclusão com relato, replay único, edição após conclusão negada, filtro Home sem concluídas, Histórico ordenado pelo instante de conclusão com cursor, e logs em ordem descendente com cursor. Migration aplicada ao dev preservando registros existentes e executada em banco vazio na integração. Biome em 165 arquivos, TypeScript API/web/contracts, boundaries, 10 testes Vitest de contracts, build Vite e `git diff --check` passaram. `timeout 40s pnpm check` terminou em 124 sem saída; não declarar o check integral aprovado. A interface não foi percorrida manualmente nesta validação.
