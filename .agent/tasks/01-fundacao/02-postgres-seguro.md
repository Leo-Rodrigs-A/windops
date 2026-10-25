# F02 — PostgreSQL e privilégios mínimos

## Status e dependências

- [x] Task concluída em 25/10/2026. Depende de [F01](01-modelagem-banco.md); implementação local e evidências abaixo.

## Objetivo e escopo

Tornar a configuração local reproduzível e persistente sem usar a conta administrativa no runtime. Preparar o mesmo contrato de papéis para produção, sem provisionar Neon/VPS nem alterar dados existentes de forma destrutiva.

## Estado atual

Antes da F02, API, migração e Electric compartilhavam o superusuário `windops`. O Compose mantém esse usuário como bootstrap para compatibilidade do volume existente. F02 provisionou `windops_app`, `windops_migrator` e `windops_replication` no PostgreSQL local; apenas o bootstrap conserva privilégios administrativos. Neon continua sem provisionamento.

## Plano de implementação

- [x] Implementar provisionamento idempotente dos papéis de runtime e migração, mantendo `windops` como bootstrap administrativo. Runtime sem superuser/DDL; migrador com DDL sem gestão de roles, banco ou replicação; replicação com `REPLICATION` e acesso explícito.
- [x] Cobrir instalação vazia por provisionador e `pnpm db:empty-check`, além de volume existente por comando repetível `pnpm db:provision`; procedimentos mantêm dados ativos sem `down -v`.
- [x] Separar `DATABASE_URL`, `MIGRATION_DATABASE_URL` e `ELECTRIC_DATABASE_URL`. Migração exige explicitamente a URL própria em dev e produção, sem fallback para runtime.
- [x] Configurar grants e default privileges, ownership da aplicação, schema/journal e publicação manual Electric. A allowlist atual contém somente `public.workspaces`; tabelas de identidade futuras não recebem grant de replicação.
- [x] Preservar volumes e portas loopback. Electric permanece interno; a rota pública de sync continua bloqueada. Manual publication reduz permissões do Electric.
- [x] Atualizar exemplos de ambiente e Compose. URLs de produção mantêm TLS `verify-full`; Neon e suas grants ainda não foram provisionados.
- [x] Atualizar comandos, migrador e CI; o serviço API de produção recebe somente `DATABASE_URL` de runtime, e o serviço de migração recebe somente `MIGRATION_DATABASE_URL`.
- [x] Documentar e automatizar backup/restauração em banco descartável por `pnpm db:restore-check`, sem sobrescrever o banco ativo.

## Testes e aceite

- [x] Em banco descartável, provisionador executado duas vezes, migração aplicada e permissões verificadas sem escalada de privilégios.
- [x] Runtime consegue DML autorizado e falha em criar/alterar tabelas, gerenciar roles ou criar banco. Migrador executa DDL, sem superuser/roles/database/replication. Replicação falha ao ler tabela privada ou executar DDL e atende o shape permitido. Tabelas auth ainda não existem; a allowlist explícita evita grants futuros a elas.
- [x] Restart de PostgreSQL preserva uma workspace de teste e o journal. `db:restore-check` restaura dump em database descartável e confirma workspaces e migrations sem tocar no banco original. Não confundir restart de contêiner com persistência offline do navegador.
- [x] Testes existentes verificam readiness 503 sem URL/credenciais e falha de configuração inválida sem revelar valores.
- [x] `pnpm check`, Compose e integração PostgreSQL/Electric passaram. Produção Neon continua pendente e não é declarada segura.

## Evidências

Concluída em 25/10/2026. O provisionador idempotente separou papéis; `pnpm db:setup` preservou o volume ativo, aplicou migrations usando `MIGRATION_DATABASE_URL`, reconciliou a publicação manual, e iniciou o Electric após provisionar as credenciais. `pnpm db:empty-check` criou database isolada, provisionou duas vezes, aplicou a migração, gravou uma workspace, reiniciou PostgreSQL, confirmou workspace/journal, reaplicou grants e testou os limites. No banco existente passaram `db:permissions`, a migration repetida e o shape Electric. `db:restore-check` comparou contagens após restauração (`workspaces:migrations=0:1`). `pnpm check` completo passou: lint, limites, typechecks, 9 testes e builds. Compose dev/produção, sintaxe shell/Node e `git diff --check` passaram. Tabelas auth ainda não existem; acesso foi verificado por tabela privada de prova e a publicação só lista `public.workspaces`. `.env` local (ignorado) usa URLs e senhas descartáveis. Neon/VPS não provisionados nem testados.
