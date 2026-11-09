# C04 — Validação integrada

**Status:** Concluída em 08/11/2026.  
**Task concluída:** [x]

## Objetivo

Comprovar migration, contratos, geração, ordenação, nome público e compatibilidade de sincronização antes de encerrar a slice.

## Aceite

- [x] `pnpm check` passa.
- [x] Integração em banco descartável cobre install/upgrade, backfill, reversão por conflito, constraints e preservação de IDs/referências.
- [x] Integração de catálogo verifica autorização, geração, edição, ordenação/paginação e conflitos concorrentes.
- [x] Migration preserva IDs estáveis de parque/turbina; a ordenação da réplica/fallback aplica-se sobre essas entidades identificadas pelo ID.
- [x] Conferir manifesto, ícones, título, textos e documentação; atualizar arquitetura, memória, modelo de dados, roadmap e índice.
- [x] Registrar explicitamente ausência de deploy/alteração direta em produção nesta slice.

## Evidências — 08/11/2026

`pnpm check` passou: Biome/boundaries, typechecks, 18 arquivos e 87 testes, builds da API/web. `pnpm db:empty-check` passou em PostgreSQL descartável, incluindo install/upgrade e conflitos com rollback transacional. `pnpm test:parks-integration` passou: tenant, autorização, criação/edição, IDs, paginação por criação e concorrência. Testes automatizados cobrem a ordenação da réplica/fallback; não foi feito ensaio manual ponta a ponta de PWA sem rede/reconexão. Nenhuma migration foi aplicada em produção e nenhum deploy foi feito. Índice, modelo de dados, roadmap e memória atualizados.
