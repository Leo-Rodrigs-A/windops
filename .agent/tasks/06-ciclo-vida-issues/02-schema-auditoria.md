# L02 — Persistência e auditoria

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Preparar armazenamento compatível com histórico e réplica.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Migration 0011 e espelhos implementados; instalação vazia e upgrade validados.

## Dependências

L01. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [x] Criar migration incremental 0011 com marcador de arquivo, índice e eventos; atualizar schemas/documentação.
- [x] Preservar eventos e referências append-only; ampliar checks sem reescrever registros existentes.
- [x] Atualizar espelho sanitizado, trigger e proxy Electric sem identidade privada; campo novo nullable.
- [x] Validar instalação vazia, upgrade desde 0004, reaplicação, grants e restore em banco descartável.

## Contratos e dados afetados

issues, audit, espelhos Electric; migration `0011_issue_lifecycle_archive`.

## Testes e aceite

Upgrade preserva issues, eventos e recibos; runtime não altera eventos antigos; validação de integração/container obrigatória. `pnpm check` aprovado.

## Evidências

28/10/2026: migration 0011, snapshot/journal, schemas, trigger Electric e filtro de shapes implementados. Instalação vazia, reaplicação concorrente, restart, grants e upgrade desde 0004 passaram em PostgreSQL descartável. `pnpm check` passou após executar o pnpm 10.34.8 declarado pelo projeto; 53 testes. Nenhum dado persistente dev alterado.
