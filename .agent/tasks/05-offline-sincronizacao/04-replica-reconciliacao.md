# S04 — Réplica local e reconciliação

## Status

Concluída em 27/10/2026

- [x] Task concluída

## Objetivo

Construir consultas locais consistentes sem apagar alterações pendentes quando a réplica mudar.

## Estado atual

Implementada em 27/10/2026 sobre o journal transacional da S02 e o proxy autorizado da S03. A réplica usa `ShapeStream` do Electric e mantém checkpoint por coleção na mesma Collection IndexedDB das linhas. A UI ainda não consome a camada; integração de telas e status fica na S07.

## Dependências

S02 e S03 concluídas.

## Escopo e exclusões

Leitura sincronizada, retomada e retenção; não substituir regras de autorização por confiança no cache.

## Plano de implementação

- [x] Integrar cliente Electric via proxy e persistência TanStack/IndexedDB na partição ativa. Linhas e checkpoint são aceitos na mesma transação; durante snapshot não confirmado, o checkpoint durável permanece em `-1` para repetir após crash.
- [x] Preparar workspace, catálogo, issues ativas e eventos. Prontidão exige snapshot completo e persistido nas cinco coleções. `hasReplicaSnapshot` diferencia cache ausente de coleção vazia.
- [x] Manter réplica server-side sanitizada separada de projeções e comandos locais; preservar texto local e sinalizar revisão remota concorrente.
- [x] Reconciliar ACK/réplica antes ou depois. ACK não avança a revisão observada; a revisão correspondente confirma o comando sem regressão. ACK de conclusão é conciliado com o tombstone de saída do shape.
- [x] Tratar `must-refetch`, resnapshot, tombstones e saída de issues ativas sem apagar o histórico/issue local nem comandos pendentes. A saída marca `serverActive=false`, não exclusão física.
- [x] Preservar acesso ao histórico que já está no cache; shape de eventos acompanha issues abertas, e cache inativo mantém até 1.000 eventos e 250 issues, além de todas as linhas com comandos pendentes.
- [x] Replicar apenas colunas allowlisted do proxy, incluindo códigos/estado de catálogo e `actor_label`; não replicar IDs, nomes ou e-mails privados de identidade.

## Contratos e dados afetados

Coleções locais de issues/eventos/catálogo e metadados de checkpoint/ACK. Servidor segue dono de revision e de timestamps autoritativos.

## Testes e aceite

- [x] Cobrir ACK antes/depois, revisão remota mais nova e resposta sem ACK seguido por revisão remota; verificar confirmação/conflito sem regressão.
- [x] Cobrir conclusão que sai do shape com fila dependente, tombstone preservado e retenção que mantém dependências.
- [x] Cobrir reabertura após snapshot parcial e delta persistido, resnapshot com cache antigo preservado e readiness só após os cinco snapshots; S02 cobre isolamento de partição.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

27/10/2026: `apps/web/src/offline/workspace-replica.ts` coordena cinco `ShapeStream`s por workspace através de `/api/sync/:collection`, hidrata a réplica no journal TanStack IndexedDB e publica prontidão após snapshots completos. `apps/web/src/offline/local-issue-store.ts` adiciona checkpoints, rows sanitizadas, resnapshot atômico, tombstones, reconciliação de revisão/ACK, `serverActive` e retenção de cache preservando issues/eventos de comandos pendentes. `apps/api/src/modules/sync/proxy.ts` mantém catálogo completo e limita shapes de issues/eventos às issues abertas; eventos não expõem dados privados. `apps/api/scripts/sync-proxy-flow.mjs` agora verifica shapes reais de issues/eventos.

Validação: Vitest completo (7 arquivos/38 testes), incluindo quatro testes da réplica; Biome (185 arquivos), boundaries, typecheck contracts/API/web, build API e Vite web passaram. Smoke `node --import tsx apps/api/scripts/sync-proxy-flow.mjs` passou contra PostgreSQL/Electric locais, incluindo subquery tenant-scoped dos eventos e janela de revogação. `git diff --check` registrado no encerramento. `timeout 60s pnpm check` não emitiu saída e expirou; equivalentes diretos passaram. Não houve migration nem alteração de inventário. A UI permanece online até a S07 integrar esta camada; navegadores/aparelhos adicionais seguem sem validação.
