# S05 — Envio, dependências e retries de comandos

## Status

Concluída em 27/10/2026

- [x] Task concluída

## Objetivo

Enviar a fila com o app aberto ou retomado, garantindo retry idempotente e ordenação por issue.

## Estado atual

Implementada em 27/10/2026 sobre a outbox da S02, a réplica da S04 e os endpoints transacionais existentes. O executor pode ser iniciado pelo ciclo de vida do app, tenta ao abrir/retomar e ao voltar rede/foco/visibilidade, e usa lease local para coordenar abas. S07 ainda conectará criação de comandos e status ao produto; o fluxo offline não está ativado nas telas.

## Dependências

S01, S02 e S04 concluídas; política temporal da S01 resolvida para os caminhos habilitados.

## Escopo e exclusões

Criar/editar/iniciar/devolver/concluir issues offline e enviar por serviços públicos existentes. Gestão de equipe/catálogo e liberação administrativa permanecem online nesta slice. Nenhum endpoint, tabela, evento ou recibo é escrito diretamente pelo executor.

## Plano de implementação

- [x] Criar `LocalCommandSender` com start/stop/flush, início imediato, eventos online/focus/visibilidade, recuperação de `sending` interrompido e backoff exponencial com jitter, limitado a 60 s. `navigator.onLine` não concede sucesso nem autorização.
- [x] Fazer preflight de sessão/membership e reutilizar os wrappers dos endpoints existentes; cada comando continua sendo reautorizado pelo servidor e o ator vem da sessão.
- [x] Ordenar a fila topologicamente por dependência. Para sucessor não tentado, materializar `expectedRevision` do ACK predecessor; detectar revisão remota mais nova. Persistir payload materializado antes da primeira transmissão.
- [x] Retentar timeout, 408, 429, 5xx e resposta perdida com a mesma chave/payload. Gravar ACK no IndexedDB antes de avançar dependentes. Replay após crash/erro ao gravar ACK não duplica eventos.
- [x] Classificar 401 como `waiting_auth`, espera do criador como `waiting_eligibility`, 403/revogação como `blocked`, 409 como conflito, demais 4xx como rejeição corrigível e falhas transitórias como retry; conflito bloqueia apenas descendentes daquela issue.
- [x] Delegar a espera de uma hora exclusivamente ao servidor; texto/relato não são tratados como confirmados antes do ACK. Retry preserva relato e chave, inclusive depois de timeout.
- [x] Persistir `chainId` estável por issue e `dependsOn` para correlacionar criação+ações em notificações futuras; liberação administrativa permanece online e não há push/outbox de notificação nesta task.

## Contratos e dados afetados

Contratos existentes de issues e recibos sync_commands; extensões mínimas compatíveis somente se justificadas pela S01. IDs e autoria de evento permanecem server-side e estáveis no replay.

## Testes e aceite

- [x] Simular criação→edição→início→conclusão com reabertura entre fases e resposta perdida pós-commit; revisões sequenciais, relatório e quatro eventos únicos verificados. Espera do autor retestada pelo servidor falso sem avançar relógio local.
- [x] Simular gravação local do ACK falha e replay, resposta perdida, duas abas com lease, sem duplicação de recibo/evento.
- [x] Cobrir 401, 403 de revogação/espera, conflito de revisão, equipamento indisponível, descendentes bloqueados e progresso de issue independente.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

27/10/2026: `apps/web/src/offline/command-sender.ts` implementa executor durável usando `getWorkspaceContext` e os wrappers existentes de issues. A outbox usa lease, fila topológica, ACK predecessor para revisão, payload congelado, replay idempotente e status de pausa/conflito/rejeição/bloqueio. `LocalIssueCommand` mantém `chainId=issueId`; dependências preservam a ordem para notificações futuras. `release` é bloqueada na fila offline e permanece ação online.

Evidência — 27/10/2026: `apps/web/src/offline/command-sender.ts` implementa `LocalCommandSender` com preflight `getWorkspaceContext`, wrappers de API existentes, lease entre abas, ordenação topológica, materialização da revisão do ACK predecessor, payload imutável antes do primeiro envio, `chainId=issueId`, backoff exponencial+jitter limitado a 60 s e classificação de respostas. `apps/web/src/offline/local-issue-store.ts` persiste preparação/retry/ACK, deriva `chainId` para comandos antigos e preserva `frozenPayload` após recuperação de `sending`. Não usa DB/eventos diretamente; `release` fica online.

Validação: Vitest completo (8 arquivos/46 testes; oito testes do sender), incluindo cadeia create→update→start→complete reaberta entre etapas, resposta perdida após commit, falha de gravação local do ACK, lease concorrente, 401/403/409, elegibilidade do autor, equipamento indisponível, dependentes, progresso de outra issue e teto do backoff. Typecheck contracts/API/web, build API e Vite web, Biome (187 arquivos), boundaries e `git diff --check` passaram. `timeout 60s pnpm check` retornou 124 sem saída; equivalentes diretos passaram. Reuso de recibos dos endpoints é coberto pelas integrações anteriores S03/I08; não foi executada nova integração PostgreSQL nesta task. Nenhuma migration ou alteração de inventário. Limite: as telas ainda não enfileiram comandos nem iniciam o sender; isso fica na S07. Não houve teste em aparelho nesta task.
