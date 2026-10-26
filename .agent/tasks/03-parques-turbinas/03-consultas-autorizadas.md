# P03 — Consultas do catálogo

## Status

Concluída em 26/10/2026.

- [x] Task concluída

## Objetivo

Disponibilizar parques e turbinas para ambos os cargos com autorização no servidor.

## Estado atual

P01/P02 concluídas. Schema parks/turbines e migração `0004` estão aplicados; esta task adiciona somente consultas, sem escrita.

## Dependências

P01 e P02 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

GETs do catálogo, DTOs públicos e serviços parks; sem escrita, sync, cache durável ou acesso Electric.

## Plano de implementação

- [x] Implementar serviço de parks sem imports privados de workspaces.
- [x] Usar `WorkspaceAuthorizationService` público para validar identidade e membership ativa em cada requisição; ambos os cargos podem ler.
- [x] Registrar GETs de lista/detalhe com schemas OpenAPI, filtrando sempre por workspace e parque pai.
- [x] Implementar busca por prefixo, paginação estável `(code,id)`, cursores tenant-scoped e estado vazio.
- [x] Exportar pelo `parks/index.ts` serviço de leitura e resolução transacional de localização com locks `FOR SHARE` na ordem parque→turbina.
- [x] Cobrir admin, técnico, órfão, revogado, sessão incompleta, tenant diferente, IDs cruzados e query/cursor inválidos em banco descartável.

## Contratos e dados afetados

GETs do catálogo, DTOs públicos e serviços parks; sem escrita, sync, cache durável ou acesso Electric. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [x] Integração em banco descartável: dois tenants, parque vazio, paginação, IDs cruzados e erros que não revelam recursos alheios.
- [x] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Implementação em 26/10/2026: quatro rotas GET; autorização tenant em toda requisição; busca/paginação estável e cursor resolvido dentro do tenant/parque. IDs externos retornam 404; cursor externo/inexistente retorna `INVALID_CURSOR`. Serviço público `getTurbineLocation` recebe `PoolClient` transacional, toma `FOR SHARE` na ordem parque→turbina e retorna marcadores de atividade para futuras issues.

Validação: integração PostgreSQL descartável passou com admin/técnico, sessão incompleta, órfão, revogado, outro workspace, busca literal, paginação, parque sem turbinas, IDs cruzados e serviço de localização. Typecheck/build API, typecheck web, Vitest (3 arquivos/18 testes), Biome (137 arquivos), boundaries e `git diff --check` passaram. `pnpm check` ficou sem saída e foi interrompido; os equivalentes foram rodados diretamente. O teste usa identity stub para exercitar o guard; a integração real de autenticação não foi alterada. Sem endpoints de escrita, UI ou dados do banco dev alterados.
