# C05 — Nomes legíveis para parques

**Status:** Concluída em 08/11/2026.  
**Task concluída:** [x]

## Objetivo

Substituir nomes/códigos `P-01`, `P-02` por `Parque 01`, `Parque 02` em dados, criação, edição e todas as superfícies visíveis, preservando o número da turbina no código `ZAC-01-04`.

## Escopo

- Converter os valores persistidos por migration aditiva `0015_park_display_names.sql`, mantendo IDs, vínculos, criação e histórico; incrementar revisão dos parques convertidos.
- Validar `Parque <número>` com no mínimo dois dígitos e até seis; gerar próximo número pela sequência existente.
- Derivar o prefixo numérico ZAC de `Parque 01` e manter a atualização do prefixo quando o parque for renomeado.
- Atualizar catálogo, filtros, seleção de localização, offline e fixtures de integração para não mostrar `Parque Parque 01` nem códigos P.
- Não reescrever a migration 0014 já registrada; nenhum deploy ou backfill em produção nesta task.

## Validação

- [x] Contract/UI/API aceitam apenas o nome canônico e geram sequência crescente.
- [x] Migration `0015` converte `P-01` em `Parque 01`, preserva IDs e aborta em colisão sem efeitos parciais.
- [x] Códigos das turbinas permanecem coerentes ao criar turbinas ou renomear parque.
- [x] Listas, filtros e seletores mostram `Parque 01` sem prefixo duplicado; leitura local mantém o nome após restart.
- [x] `pnpm check`, `pnpm db:empty-check`, `pnpm test:parks-integration` e `pnpm test:issues-integration` passam.

## Evidências

## Evidências — 08/11/2026

`pnpm check` passou (18 arquivos, 87 testes e builds). `pnpm db:empty-check` confirmou instalação/upgrade, `P-01` → `Parque 01`, IDs estáveis, rollback em colisões do estágio legado e constraints. `pnpm test:parks-integration` e `pnpm test:issues-integration` passaram contra PostgreSQL descartável; o fluxo de parques cobre renomeação, prefixo ZAC, busca com espaço, paginação e tenant. `pnpm --filter @windops/api exec drizzle-kit check` aprovou journal/snapshot. Nenhuma migration foi aplicada em produção.
