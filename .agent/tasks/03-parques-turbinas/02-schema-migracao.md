# P02 — Schema, migração e privilégios

## Status

Concluída em 26/10/2026.

- [x] Task concluída

## Objetivo

Persistir o catálogo com integridade tenant e preservar o banco existente.

## Estado atual

P01 concluída. Schema Drizzle de parques e turbinas implementado; migração `0004_parks_turbines` aplicada ao ambiente dev. Rotas e telas ainda não existem.

## Dependências

P01 concluída. Ver [índice da slice](README.md).

## Escopo e exclusões

Tabelas parks/turbines, migração/journal e provisionamento de grants quando necessário; sem endpoints ou telas.

## Plano de implementação

- [x] Implementar `parks/schema.ts` e gerar `0004_parks_turbines`, mantendo as migrações anteriores intactas.
- [x] Criar índices únicos por workspace/parque, índices de leitura por tenant, FKs explícitas workspace→parks/turbines e FK composta parque+workspace→turbines; checks de código e revision.
- [x] Restringir exclusões por FK `ON DELETE RESTRICT`; sem tabela elevators, seed ou inventário no dev.
- [x] API usa grants DML padrão do `windops_migrator`; Electric não recebe SELECT nem publicação sobre parks/turbines. Sem alteração necessária no script de provisionamento.
- [x] Validar banco vazio, migração concorrente, upgrade desde `0003`, integridade entre dois tenants descartáveis, unicidade, formato, revision e privilégios.
- [x] Aplicar a migração ao dev pelo migrador dedicado e verificar journal, acesso da API, negação ao Electric e grants restritos.

## Contratos e dados afetados

Tabelas parks/turbines, migração/journal e provisionamento de grants quando necessário; sem endpoints ou telas. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [x] Verificar duplicidade no mesmo escopo, códigos iguais em parques/workspaces distintos, FK entre tenants, revisão e grants. Rodar `drizzle-kit check` e checks de banco/contêiner; registrar rollback como correção aditiva, sem downgrade destrutivo.
- [x] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Implementação em 26/10/2026: `apps/api/src/modules/parks/schema.ts`, migração `0004_parks_turbines.sql`, snapshot/journal e `parks-schema-check.mjs`. `.agent/database.md` e arquitetura atualizados com estado real. Migration cria as duas tabelas, checks, índices e FKs com `RESTRICT`; as FKs entre módulos ficaram em SQL manual para preservar a regra de imports públicos. Padrões default grants dão DML à API; verificação confirmou que Electric não lê nem replica o catálogo.

Validação: suíte P02 em dois bancos Docker descartáveis passou — instalação vazia, duas execuções concorrentes, constraints, isolamento cruzado, grants, ausência na publication e upgrade desde `0003` preservando workspace/membership. `permissions.mjs` passou no dev após aplicar `0004`. `drizzle-kit check`, Biome (134 arquivos), boundaries, Vitest (3 arquivos/18 testes), typechecks API/web e builds API/web passaram. `pnpm check` foi iniciado, mas ficou sem saída e sem processo de verificação observável; os equivalentes foram rodados diretamente. Rollback automático não foi criado. A migração é aditiva; falha posterior deve ser corrigida com forward migration. Nenhum parque ou turbina foi inserido no banco dev.
