# P04 — Cadastro e edição administrativa

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Permitir que administradores cadastrem e corrijam códigos sem sobrescrever alterações concorrentes.

## Estado atual

P01–P03 concluídas. O catálogo tem schema PostgreSQL, consultas tenant-scoped e serviço público de localização. A task implementa escrita na API; interface permanece para P05.

## Dependências

P01–P03 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

POST/PATCH de parks/turbines, revisão e erros de conflito; sem histórico de issues, outbox offline ou notificações.

## Plano de implementação

- [x] Implementar POST/PATCH de parques e turbinas nos contratos previstos; permitir somente admin ativo com segunda etapa concluída.
- [x] Revalidar autorização dentro da transação, bloqueando workspace e membership na mesma ordem das alterações administrativas de membership.
- [x] Validar e normalizar entradas pelos schemas estritos; derivar workspace do caminho autorizado, validar parque pai ativo e não aceitar workspace_id/park_id alternativos por mass assignment.
- [x] Usar unicidade PostgreSQL como garantia contra criações concorrentes e devolver `409 CATALOG_CODE_TAKEN`.
- [x] Aplicar `expectedRevision`, incrementar revisão sob lock e retornar `409 REVISION_CONFLICT` para estado obsoleto.
- [x] Preservar UUIDs e relação da turbina ao renomear; sem mover turbina, excluir, desativar ou reativar nesta slice.
- [x] Cobrir corridas de escrita e perda de permissão em integração PostgreSQL descartável; publicar o método transacional de autorização no serviço público de workspaces.

## Contratos e dados afetados

POST/PATCH de parks/turbines, revisão e erros de conflito; sem histórico de issues, outbox offline ou notificações. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [x] Integração cobre técnico proibido, revogação concorrente, duplicidade concorrente, revisão obsoleta/conflitante, retries por código, isolamento de tenant e persistência após reconstruir a API.
- [x] Registrar comandos, resultados, limitações e arquivos alterados.

## Evidências

Implementada em 26/10/2026. Rotas: `POST/PATCH /api/workspaces/:workspaceId/parks` e `POST/PATCH /api/workspaces/:workspaceId/parks/:parkId/turbines`. Escritas aceitas somente por admin com etapa de sessão completa; autorização, locks e alteração ocorrem na mesma transação. Criação repetida após timeout não tem chave de idempotência: o índice único retorna `409 CATALOG_CODE_TAKEN`; cliente reconcilia consultando o catálogo antes de tentar outro código. Revisão obsoleta retorna `409 REVISION_CONFLICT`.

Integração `node --import tsx apps/api/scripts/parks-catalog-flow.mjs` passou em PostgreSQL descartável: autorização por cargo, campos extras rejeitados, duplicidade concorrente (uma criação e um conflito), updates concorrentes (uma revisão aceita e uma rejeitada), conflito de código, isolamento do parque pai, estabilidade de UUID/vínculo, nova instância Fastify lendo os mesmos dados persistidos e revogação serializada antes de gravar. Identity é stubada no teste HTTP; queries e locks de autorização/membership usam PostgreSQL real. Nenhum dado de desenvolvimento foi criado ou alterado. A fixture recria a instância da API no mesmo processo, não encerra e relança um processo de servidor separado.

Validação: `node_modules/.bin/biome check .`, `node scripts/check-boundaries.mjs`, typechecks de contracts/API/web e `node_modules/.bin/vitest run` passaram (18 testes em 3 arquivos). `pnpm check` permaneceu sem saída por aproximadamente 16s e foi interrompido; equivalentes diretos passaram. Limitação: não foi feito teste com provedor real de sessão/OAuth; autorização usa o serviço público identity stubado na fixture descartável.
