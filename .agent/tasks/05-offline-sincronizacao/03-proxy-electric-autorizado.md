# S03 — Proxy Electric e publicação autorizada

## Status

Concluída em 27/10/2026

- [x] Task concluída

## Objetivo

Entregar somente dados autorizados do workspace por um proxy controlado pelo servidor.

## Estado atual

Implementada e validada em 27/10/2026. O proxy entrega shapes somente por autorização do workspace; a publicação usa projeções sanitizadas e publication/grants conferidos no PostgreSQL.

## Dependências

S01 concluída, incluindo o conjunto de dados e a estratégia de shapes.

## Escopo e exclusões

Proxy e publicação mínima/projeções necessárias; sem expor Electric diretamente, identidade privada ou recibos globais.

## Plano de implementação

- [x] Substituir o 503 de /api/sync/:collection apenas para coleções autorizadas. Guard exige sessão completa com segunda etapa e membership ativa; workspace é resolvido/validado no servidor.
- [x] Fixar tabela/projeção, colunas e filtro tenant por coleção. Aceitar apenas parâmetros de protocolo necessários e validados; rejeitar table/where/URL/headers arbitrários e parâmetros duplicados capazes de alterar o escopo.
- [x] Assinar handles Electric com HMAC e vinculá-los a workspace/coleção; exigir offset junto ao handle em toda continuação e rejeitar offsets isolados. Validar antes de encaminhar reconexões, reautorizar polls e limitar upstream a 15s. Resposta long poll foi interrompida em 10s após revogação. Propagar abort e limitar corpo buffered a 16 MiB.
- [x] Aplicar `no-store, private`, `Vary: Cookie` e headers explícitos; não repassar segredo Electric, cookies, content-encoding ou headers internos ao cliente. Handle cru nunca sai do proxy.
- [x] Criar projeções mínimas de issues e histórico. Nenhuma tabela auth, membership, convite, evento bruto, referência privada ou recibo entra na publication.
- [x] Atualizar database.md antes de migrations/provisionamento; reconciliar allowlist de tabela/grants/publication e validar migração vazia, upgrade, reaplicação, restore e privilégios.
- [x] Verificar Compose/Caddy: Electric sem porta publicada, em rede privada e acessível pela API em URL interna; Caddy encaminha `/api/*` apenas para API. Compose de produção validado com valores locais descartáveis; nenhum ambiente externo foi alterado.

## Contratos e dados afetados

Módulo sync e autorização pública de workspaces/identity; projeções dos respectivos proprietários quando exigidas. Contrato de coleções permitido e erros estruturados; migrations/grants explícitos e revisados.

## Testes e aceite

- [x] Com Electric real, rejeitar anônimo, sessão pendente e membro sem acesso; nenhuma linha externa é entregue. Scope de outro tenant e handle de outro scope também são cobertos por testes de integração/unidade.
- [x] Tentar injetar filtros, trocar workspace/handle, e abrir long poll antes de revogar; cache tem política privada. A validação usa um workspace real e um UUID de outro tenant; a regra de um workspace único do piloto impede dois workspaces simultâneos no banco dev.
- [x] Validar propagação de abort, timeout, limite de corpo e indisponibilidade sem vazamento; grants/publication contêm exatamente workspaces, parks, turbines, issue_sync_rows e issue_sync_events.
- [x] Registrar arquivos alterados, comandos/resultados e limitações abaixo.

## Evidências

27/10/2026: implementado o proxy em `apps/api/src/modules/sync/{routes,proxy}.ts`; handles Electric são assinados e escopados por workspace/coleção. `issue_sync_rows` espelha por trigger as colunas públicas da issue; `issue_sync_events` contém snapshots allowlisted. Migration `0010_sync_issue_rows`, provisionamento de role/publication e validações foram atualizados. Compose de produção mantém Electric sem porta pública e Caddy encaminha somente `/api/*` à API.

Evidências executadas:

- `node_modules/.bin/vitest run` — 6 arquivos, 34 testes passaram; inclui filtro fixo, parâmetros duplicados, segredo/cookies, handles assinados e escopados, abort, tamanho máximo, revogação e indisponibilidade.
- `node --import tsx apps/api/scripts/sync-proxy-flow.mjs` — Electric 1.8.1 real: shape autorizada, anônimo, segunda etapa pendente, workspace sem membership, injeção de filtro, cache privado e revogação em 10.005–10.006 s (limite 12 s). O banco dev impõe `workspaces_singleton`; tentativa de criar segundo workspace foi rejeitada pela constraint. O vínculo criptográfico do handle com um segundo workspace é provado em teste unitário com escopos distintos.
- `node --import tsx apps/api/scripts/issues-read-flow.mjs` — integração descartável passou; criação/edição/replay mantêm issue e espelho consistentes e snapshots sanitizados.
- `node apps/api/scripts/empty-database.mjs` — instalação vazia, migração concorrente/repetida, upgrade, persistência e grants passaram.
- `node apps/api/scripts/permissions.mjs` — grants runtime/migrator/replicação; publication exata e ausência de leitura de `issues` bruto, eventos privados, memberships e auth verificadas.
- `sh infra/postgres/verify-restore.sh` — restore descartável preservou 11 migrations, `issue_sync_rows` e `issue_sync_events`.
- `node_modules/.bin/biome check .`, `node scripts/check-boundaries.mjs`, typechecks contracts/API/web, builds contracts/API/Vite, `git diff --check`, `sh -n` nos scripts e `docker compose ... config --quiet` passaram. Compose de produção foi renderizado com placeholders locais descartáveis.
- `pnpm check` não produziu saída após 90 segundos e foi interrompido; os componentes equivalentes foram executados diretamente e passaram. Produção/Neon não foi provisionada nem testada.
