# I08 — Validação integrada e encerramento

## Status

Concluída em 26/10/2026 após aceite do proprietário

- [x] Task concluída

## Objetivo

Comprovar o fluxo online completo e documentar a base entregue para offline/sync.

## Estado atual

Validação automatizada integrada passou. Em 26/10/2026, o proprietário confirmou todas as funcionalidades implementadas e aprovou a slice; esse aceite encerra a validação funcional. A aprovação não é registrada como teste independente em dispositivo ou certificação de acessibilidade.

## Dependências

I01–I07 e I09 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Validação, correções necessárias e documentação; não implementar antecipadamente as etapas 07–11.

## Plano de implementação

- [x] Executar pnpm check e integrações issues, parks, workspaces e autenticação. Se o shim voltar a travar, registrar saída/tempo e equivalentes diretos; nunca declarar pnpm check aprovado sem evidência.
- [x] Validar migração vazia/repetida, upgrade preservando catálogo e contas, restart, restore e privilégios com comandos existentes; conferir publicação Electric sem novas tabelas privadas.
- [x] Reexecutar matriz tenant/ator/revisão e corridas das I04–I06 com conexões reais e fixtures descartáveis; induzir falha antes do commit e perda da resposta após commit.
- [x] Comprovar persistência de issues/eventos/recibos após restart e replay sem duplicação; separar essa garantia PostgreSQL de persistência local ainda inexistente.
- [x] Registrar o aceite do proprietário para as funcionalidades implementadas. Nenhum inventário operacional foi alterado nesta validação.
- [x] Registrar limite de evidência: não houve comprovação separada por desktop/Android/iPhone nem aferição de acessibilidade; nenhum servidor/exposição temporária foi iniciado nesta rodada.
- [x] Atualizar tasks, índice, memória, arquitetura, database e roadmap com o que efetivamente passou. Offline, reabertura e arquivo de issues continuam posteriores; não declarar lifecycle completo.
- [x] Registrar dependências para próxima slice: persistência local/outbox durável, proxy Electric, reconciliação, restart do aparelho, exportação de pendências, expiração/revogação e conflitos; notificações e reabertura continuam posteriores. Sugerir commit em português.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Aceite: criação/edição/atendimento autorizados; histórico imutável e sem duplicação; equipamentos com referências atuais ou históricas preservados; exclusão sem histórico segura contra concorrência.
- [x] Aceite: fluxo UI aprovado pelo proprietário; dados persistem no PostgreSQL após restart/replay; nenhuma promessa offline; evidências datadas e limitações explícitas.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: validação automatizada integrada concluída. `timeout 40s pnpm check` terminou com código 124 sem saída; equivalentes diretos passaram: Biome (167 arquivos), limites de módulos, build/typecheck contracts e API, typecheck/build Vite web e Vitest (3 arquivos, 19 testes). `pnpm db:empty-check` aprovou migração vazia e repetida, constraints, restart e upgrade desde 0004 preservando workspace, identidade e catálogo; `pnpm db:restore-check` restaurou `workspaces:migrations=1:8` e o schema de issues; `pnpm db:permissions` aprovou grants. `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:parks-integration` e `pnpm test:issues-integration` passaram em PostgreSQL descartável; issues incluiu rollback injetado antes do commit, replay após perda simulada da resposta, restart de serviço, conflitos, isolamento tenant, revogação e corridas de lifecycle. Consulta à publication `electric_publication_default` retornou somente `public.workspaces`. Nenhum inventário operacional foi alterado; os testes criaram/removeram bancos descartáveis.

Aceite funcional do proprietário registrado em 26/10/2026: confirmou todas as funcionalidades implementadas e aprovou a slice. Persistência após restart comprovada para PostgreSQL/recibos; persistência local durável e operação offline ainda não existem. Não houve comprovação independente por dispositivo nem aferição de acessibilidade. Próxima slice deve detalhar outbox/persistência local, proxy Electric, reconciliação, retomada após restart do aparelho, exportação de pendências, revogação/expiração e resolução de conflitos. Notificações, reabertura e arquivo de issues seguem posteriores.
