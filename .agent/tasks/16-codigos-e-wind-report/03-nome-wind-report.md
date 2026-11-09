# C03 — Nome Wind Report

**Status:** Concluída em 08/11/2026.  
**Task concluída:** [x]

## Objetivo

Exibir Wind Report como nome do aplicativo em interfaces, título do documento, manifesto/instalação PWA e mensagens transacionais enviadas pelo produto.

## Escopo

- Atualizar textos de marca e exemplos visíveis em `apps/web`.
- Definir `name`, `short_name`, title/meta PWA e título HTML como `Wind Report`.
- Atualizar assuntos e textos de email e título OpenAPI que exibem o nome do produto.
- Manter compatibilidade de storage, sessão, service worker, package/service IDs, domínio e env vars; não renomear namespaces internos `windops`.

## Testes de aceite

- [x] PWA instalada recebe o nome “Wind Report”.
- [x] Busca de strings de interface/email não revela rótulos visíveis residuais “Wind Ops”.
- [x] Códigos técnicos internos `windops` mantêm os valores existentes.

## Evidências — 08/11/2026

Manifesto (`name`/`short_name`), título HTML/meta, interface, emails e título OpenAPI foram revisados e atualizados. `pnpm check` passou. Identificadores internos de storage, sessões, pacotes, serviços e assets técnicos `windops` foram mantidos para compatibilidade.
