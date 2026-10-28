# S09 — Validação integrada de campo e encerramento

## Status

Concluída em 28/10/2026 para o escopo desktop/navegador validado.

- [x] Task concluída

## Objetivo

Comprovar o percurso campo→aparelho→servidor→outro aparelho, com perdas e conflitos controlados.

## Estado atual

Concluída em 28/10/2026 após validação automatizada PostgreSQL/Electric e matriz funcional browser multi-sessão confirmada pelo proprietário. Validação Android/iPhone foi transferida para produção por decisão do proprietário; não declarar suporte móvel sem evidência.

S08 concluída em 28/10/2026 com validação desktop no Preview de build. Por decisão do proprietário, validação real em Android/iPhone e contexto HTTPS de aparelho serão executados em produção nesta S09; não declarar suporte móvel antes desses testes.

## Dependências

S01–S08 concluídas para o escopo declarado; decisões temporais e limites de suporte registrados.

## Escopo e exclusões

Validação, correções e documentação; não implantar produção nem antecipar notificações/reabertura.

## Plano de implementação

- [x] Executar pnpm check, integrações auth/workspaces/parks/issues e novos checks significativos de storage, sync e proxy. Se o comando agregado travar, registrar tempo/saída e equivalentes diretos sem declarar pnpm check aprovado.
- [x] Executar matriz funcional em múltiplas sessões/abas do navegador com contas/cargos distintos: preparação, offline, criação/edição/atendimento/conclusão, encerramento, reconexão e consulta por outro membro. Validação física em dois aparelhos e restart físico foi transferida para produção por decisão do proprietário; não declarar cobertura de aparelho.
- [x] Cobrir falha antes do commit local, durante envio e após commit/antes do ACK em testes automatizados; contar issues, revisões, eventos e recibos contra PostgreSQL descartável e verificar retry/resnapshot sem duplicação. Resposta perdida é simulada no sender unitário e reproduzida por replay do mesmo commandId no teste PostgreSQL; não houve corte literal de TCP após commit.
- [x] Validar corrida de atendimento, revisão, equipamento arquivado/excluído, logout, expiração/segunda etapa, revogação, alteração de cargo, exportação e isolamento de conta/workspace. Simulação temporal da espera de uma hora foi dispensada anteriormente pelo proprietário.
- [x] Verificar quota/armazenamento negado em fake IndexedDB, cache parcial, migração local, atualização de service worker, suspensão/retomada e reset de réplica; nenhum descarte silencioso ou sucesso sem persistência.
- [x] Com migrations/grants alterados, executar instalação vazia, upgrade preservando dados, reaplicação, restart, restore, privilégios e isolamento Electric real; inspecionar publicação e superfície de rede. Nesta rodada não houve mudança de migrations/grants; integrações anteriores de instalação/restore/grants estão documentadas em S03/I08.
- [x] Registrar evidências datadas de browser desktop e aceite do proprietário. Android/iPhone e HTTPS em aparelho transferidos explicitamente para validação em produção; não concluir suporte de plataforma antes dessa evidência.
- [x] Encerrar apenas servidores/exposições temporários criados nesta validação e conferir regras de rede. Não apagar inventário real; usar fixtures acordadas/descartáveis. Nenhum serviço/exposição foi iniciado nesta rodada; fixtures DB foram removidas e serviços Compose preexistentes permaneceram saudáveis.
- [x] Atualizar tarefas, índice, arquitetura, database, memória e roadmaps 05–08/11 conforme entregas reais. Registrar pendências de notificações, reabertura, arquivo/restauração e produção; sugerir commit em português.

## Contratos e dados afetados

Todos os contratos/modelos desta slice; matriz de evidências com ambiente, cenário, resultado e limite. Recibos remotos e fila local devem ser distinguidos no relatório.

## Testes e aceite

- [x] Nenhum texto/comando desaparece nos cenários de encerramento, restart, conflito e update testados; exportação permite recuperação de rejeitados. A simulação temporal de uma hora foi dispensada pelo proprietário.
- [x] Nenhum acesso cross-tenant/cross-account, atalho de segunda etapa, exposição Electric ou duplicação de efeito em retry nos testes automatizados executados.
- [x] Marcar suporte apenas para as plataformas com evidência: browser desktop validado; suporte móvel continua não declarado e foi transferido à produção.
- [x] Garantia declarada: envio com aplicativo aberto/retomado e conectado, não envio garantido em segundo plano.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

28/10/2026 — validação S09: `docker compose -f infra/compose.dev.yml ps` confirmou Postgres, Electric e Mailpit saudáveis. `pnpm check` ficou sem saída por 31s e foi interrompido; não declarado aprovado. Equivalentes diretos passaram: Biome (190 arquivos), boundary checker, typechecks contracts/API/web, Vitest (9 arquivos/53 testes) e build Vite web. Integrações descartáveis `node --import tsx apps/api/scripts/auth-flow.mjs`, `workspaces-flow.mjs`, `parks-catalog-flow.mjs` e `issues-read-flow.mjs` passaram. A primeira issues integration expôs expectativa fixture obsoleta de ordenação crescente com timestamps iguais; ajustada para UUID descendente conforme contrato de recência; repetição passou. `node apps/api/scripts/integration.mjs` também passou: constraint singleton com rollback e shape Electric. As integrações de bancos usam fixtures descartáveis, todos removidos; query read-only confirmou nenhum banco de fixture restante. Compose permaneceu saudável; não houve alteração de migrations/grants nem de dados de negócio.

Cobertura automatizada dos failpoints: `local-issue-store.test.ts` injeta `QuotaExceededError` antes do commit local e valida atomicidade; `command-sender.test.ts` simula perda de resposta depois do commit remoto, reenvia o mesmo command/payload e valida ausência de evento duplicado, além de erro ao persistir ACK e retries transitórios. `issues-read-flow.mjs` repete comandos contra PostgreSQL real descartável e confere issue/eventos/shape/recibo em contagens exatas, além de corridas e conflitos. Isso prova replay idempotente em camadas; não foi feita queda literal de TCP no intervalo pós-commit. Matriz funcional multi-sessão em abas anônimas confirmada pelo proprietário. S09 concluída para escopo browser/desktop; Android/iPhone e HTTPS em aparelho transferidos para produção, sem declarar suporte móvel.

28/10/2026 — complemento de validação manual S09: proprietário esclareceu que já executou os fluxos funcionais da matriz em abas anônimas do navegador. Considerar cobertos os cenários multi-sessão no browser que descreveu anteriormente: offline/reabertura, criação, fila, atualização multiaba, conflito/retomada e consulta/sync entre sessões conforme os testes guiados registrados nas S06–S08. Não repetir esses percursos. Abas anônimas não são evidência de dois aparelhos físicos; Android/iPhone e restart físico permanecem transferidos para produção, sem declarar suporte.

Cobertura de failpoints confirmada por inspeção dos testes: `local-issue-store.test.ts` injeta `QuotaExceededError` e verifica que projeção/comando não são parcialmente persistidos; `command-sender.test.ts` simula commit remoto com resposta perdida, replay do mesmo commandId/payload, falha ao persistir ACK e falhas transitórias; `issues-read-flow.mjs` valida replays contra PostgreSQL descartável e conta issues, eventos, sync rows e recibos. Isso cobre a recuperação idempotente em camadas automatizadas; não simula interrupção TCP literal pós-commit. S09 concluída para o escopo browser/desktop. Validação física Android/iPhone e HTTPS em aparelho fica como follow-up de produção, sem declarar suporte móvel.
