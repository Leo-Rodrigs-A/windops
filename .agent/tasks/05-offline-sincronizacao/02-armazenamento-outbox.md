# S02 — Armazenamento local e fila durável

## Status

Concluída em 27/10/2026

- [x] Task concluída

## Objetivo

Persistir dados e intenções no aparelho antes do feedback de gravação e recuperar o trabalho após interrupções.

## Estado atual

Implementada em 27/10/2026. Ver evidências e limitações abaixo e o [índice da slice](README.md).

## Dependências

S01 concluída quanto ao modelo e à prova de persistência.

## Escopo e exclusões

Armazenamento e fila local; sem habilitar envio automático ou considerar estado local confirmado no servidor.

## Plano de implementação

- [x] Implementar o adaptador escolhido na S01, schema local versionado e partições por conta/workspace; não usar localStorage para dados operacionais/fila.
- [x] Gravar comando e projeção local em journal transacional; só resolver após commit persistido. Falha do IndexedDB rejeita a operação sem falso sucesso.
- [x] Implementar estados persistidos de pendente, em envio, aguardando autenticação/elegibilidade, conflito, rejeitado e confirmado aguardando réplica; recuperação de envio interrompido preserva identidade e payload congelado.
- [x] Persistir dependências de criação e mutações da mesma issue; separar revisão base do servidor das revisões da projeção local.
- [x] Implementar lease recuperável entre abas com expiração persistida; idempotência do servidor continua necessária se dois envios escaparem.
- [x] Garantir exportação versionada de comandos pendentes com texto, localização, IDs e motivo do bloqueio, sem credenciais. Exportação não equivale a sincronização nem a importação automática.
- [x] Tratar quota, armazenamento negado/corrompido e remoção automática sem limpar pendências; solicitar persistência quando suportado. A falha é propagada ao chamador, sem confirmação falsa, e não há rotina de limpeza de comandos.

## Contratos e dados afetados

Modelo local versionado de réplica, intenções e outbox; recibos PostgreSQL sync_commands existentes continuam sendo a prova de confirmação remota, não uma fila no aparelho.

## Testes e aceite

- [x] Criar e editar no journal sem rede, fechar/reabrir a conexão: conteúdo e dependências reaparecem uma vez.
- [x] Simular quota, falha de transação, upgrade de schema, duas instâncias e lease abandonada; ausência de espaço impede confirmação de salvamento.
- [x] Exportar e inspecionar pendências sem cookies/tokens; nenhuma rotina remove comandos não confirmados.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

27/10/2026: `apps/web/src/offline/local-issue-store.ts` implementa IndexedDB/TanStack DB em banco versionado por UUID de conta e workspace, journal com comando/projeção na mesma transação, validação dos payloads com contratos compartilhados, dependências, revisão do servidor separada da revisão local, estados de outbox, recuperação de envio interrompido com chave/payload preservados, lease IndexedDB com expiração, pedido de persistência do navegador e exportação JSON versionada. Nenhum envio automático foi habilitado e a interface online existente não foi ligada à store nesta task.

27/10/2026: implementado banco IndexedDB v2 por partição, journal transacional de comandos/projeções, dependências, recuperação, estados, lease, exportação e pedido de persistência. `local-issue-store.test.ts` passou (6 testes), cobrindo criação/edição e retomada, isolamento por conta, retry idempotente, falha de armazenamento, `QuotaExceededError` simulado sem gravação parcial, upgrade v1→v2 preservando projeção, exportação sem credenciais e lease expirada. TypeScript web, Biome nos 180 arquivos, boundaries, Vitest (5 arquivos/27 testes), build Vite web e `git diff --check` passaram. `pnpm check` continuou sem saída por 30 segundos; os equivalentes diretos foram executados e passaram. A quota foi simulada no fake IndexedDB, não provocada no navegador físico; limpeza/evicção do browser também não foi simulada. A store propaga erros e nunca remove pendências automaticamente. Não houve integração aos formulários nem envio automático, ambos fora do escopo desta task.
