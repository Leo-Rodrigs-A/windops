# I02 — Schema, migrações e privilégios

## Status

Concluída em 26/10/2026.

- [x] Task concluída

## Objetivo

Persistir chamados, histórico e recibos atômicos com integridade tenant e retenção de associações.

## Estado atual

I01 concluída. Antes da I02, não havia tabelas de issues, audit ou recibos. As migrations `0005_issues_audit_sync` e `0006_issue_integrity_checks` agora criam schema, integridade tenant, checks e privilégios append-only. Endpoints e implementação de serviços permanecem em I03–I06.

## Dependências

I01 concluída, incluindo decisões do agregado. Ver [índice da slice](README.md).

## Escopo e exclusões

Schema/migrações e permissões mínimas; sem habilitar replicação ou endpoints.

## Plano de implementação

- [x] Criar migrações incrementais após 0004, sem reescrever migrations aplicadas; separar ownership issues/audit/sync e manter journal/snapshots coerentes.
- [x] Adicionar FKs compostas tenant para localização, issue/eventos e atores históricos; revogação de membership não remove autor. Impedir exclusão em cascata de issues/eventos.
- [x] Modelar referências históricas de equipamento consultáveis e protegidas por integridade referencial, inclusive antes/depois de mudança de localização. JSON isolado sem proteção não basta para decidir exclusão.
- [x] Adicionar checks de texto, revisão e consistência estado/responsável, índices de lista/histórico e unicidade dos recibos por escopo definido em I01.
- [x] Garantir append-only para eventos pelo papel runtime (INSERT/SELECT, sem UPDATE/DELETE), ajustando default grants excessivos; recibos privados sem acesso Electric.
- [x] Validar instalação vazia, dupla migração, upgrade desde 0004 preservando catálogo e contas, restart, restore e grants; aplicar em dev apenas após integração descartável, sem inventário fictício.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Executar `pnpm check`, `db:empty-check`, `db:restore-check` e `db:permissions`, adequando fixtures para as tabelas novas. `pnpm check` ficou sem saída por 40s; equivalentes diretos foram executados.
- [x] Provar rejeição de FK cruzada, exclusão de equipamento com referência atual/histórica, estado inconsistente e alteração de evento pelo runtime. Registrar separadamente validação descartável e aplicação dev.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: `0005_issues_audit_sync` e `0006_issue_integrity_checks` geradas por Drizzle; FKs compostas cross-module revisadas/adicionadas no SQL, snapshots e journal aprovados por `drizzle-kit check`. Schema adicionado a `issues`, `audit` e `sync`; referências de localização são protegidas por FKs e eventos/referências/recibos são append-only para `windops_app`. `provision-roles.sh` mantém esses grants específicos e `permissions.mjs` verifica negação de UPDATE/DELETE e de leitura pelo Electric.

Validação: `node apps/api/scripts/empty-database.mjs` passou instalação vazia, execução concorrente/repetida das migrations, constraints de texto/estado/tenant, localização histórica após mudança, chave de recibo, imutabilidade de eventos, restart, privilégios e upgrade iniciado exatamente em 0004 preservando workspace, membership/conta e parque/turbina. `node apps/api/scripts/permissions.mjs` passou no banco dev após migração. `sh infra/postgres/verify-restore.sh` passou após a migração, verificando `workspaces:migrations=1:7` e as quatro tabelas novas restauradas. As migrations foram aplicadas ao PostgreSQL dev persistente; nenhum inventário foi inserido nele.

`pnpm check` não emitiu saída em 40s (timeout 124), então não é declarado aprovado. Equivalentes diretos passaram: Biome em 150 arquivos, boundaries, typecheck contracts/API/web, 19 testes Vitest, builds de API e Vite, `drizzle-kit check`, `sh -n` dos scripts e `git diff --check`. Nenhum endpoint ou serviço de negócio foi ativado nesta task.
