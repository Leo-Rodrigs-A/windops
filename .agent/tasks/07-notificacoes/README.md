# Slice 07 — Campainha e Web Push

## Status

- Concluída em 28/10/2026 para o escopo validado.

- [x] Slice concluída

## Resultado esperado

Membros recebem avisos individuais dos eventos de issues e podem marcá-los como lidos. Criação gera push aos demais membros elegíveis; outros eventos ficam na campainha. Entregas têm intenção durável e retry recuperável.

## Análise da base

Slices 01–06 registradas como concluídas para seus respectivos escopos. Inspeção inicial: `notifications/index.ts` estava vazio; `platform/push.ts` apenas enviava via web-push; Bell estava desativada; audit recebe a transação de issues e persiste eventos. N02–N04 implementaram backend/outbox/worker, N05 concluiu a interface PWA e entrega real, e N06 concluiu a validação integrada da [etapa 09](<../00 - roadmap/09-notifications.md>).

## Dependências e limites

- Ler [arquitetura](../../architeture.md), [memória](../../memory.md) e [convenção](../README.md). Preservar serviços públicos do monólito e autorização tenant.
- Excluir ator; avisos individuais sem agrupamento; nenhum e-mail de evento. Não gerar retroativamente avisos para todo o histórico.
- Se uma conclusão válida for confirmada antes de o worker reivindicar o push pendente da criação, cancelar o push e suprimir o aviso interno de criação; preservar ambos os eventos e criar o aviso interno de conclusão. N01 definiu o limite de corrida e manteve a espera de uma hora; não inferir conclusão futura.
- Campainha online nesta slice, atualizada ao abrir/retomar e por polling limitado. Sem replicar dados pessoais de push pelo Electric, sem novo comando durável offline de leitura.
- Garantia de deduplicação no banco; entrega externa após resposta perdida requer política explícita, sem promessa de exatamente uma exibição.
- Sem filtros avançados, exclusão de conta, deploy ou provisionamento de produção. Validação móvel continua no roadmap 11; push real desktop faz parte do aceite desta slice.
- Design permanece externo e só será consultado após confirmar o documento; planejamento não aprova novos layouts.

## Ordem e dependências

- [x] [N01 — Contratos e política de entrega](01-contratos-politica.md) — Slices 05/06.
- [x] [N02 — Persistência e outbox transacional](02-persistencia-outbox.md) — N01.
- [x] [N03 — API da campainha](03-api-campainha.md) — N02.
- [x] [N04 — Subscrições e worker de push](04-worker-subscriptions.md) — N01–N03.
- [x] [N05 — Campainha e integração PWA](05-interface-pwa.md) — N03/N04; interface/PWA e push real validados pelo proprietário.
- [x] [N06 — Validação integrada e encerramento](06-validacao-integrada.md) — N01–N05; checks, integrações e push real concluídos.

## Aceite da slice

- [x] Evento e intenção de notificar são atômicos; retry não duplica avisos no banco.
- [x] Destinatários, canais e regra de lote respeitam a matriz N01.
- [x] Leitura e subscrições isoladas por usuário/tenant; revogação tratada.
- [x] Worker recupera falhas/restart e descarta endpoints expirados.
- [x] Campainha e push real validados no front; limites externos documentados.

## Evidências

28/10/2026: planejamento baseado em roadmap, memória, arquitetura, schema documentado e inspeção de notifications, adaptador push, audit, sender e Bell. Nenhuma fonte, migration ou infraestrutura alterada; testes de aplicação não executados.

28/10/2026 — N02 concluída: migration 0012, emissão transacional de notificações, intenção push e cancelamento após conclusão implementados; integração issues, instalação vazia, upgrade, grants, restore, Drizzle e `pnpm check` passaram. Migration aplicada ao banco dev persistente por solicitação explícita e `pnpm db:permissions` passou. Ver [N02](02-persistencia-outbox.md).

28/10/2026 — N03 concluída: API online da campainha com DTO mínimo, paginação/cursor estável, contagem não lida e leitura idempotente autorizada. Integração PostgreSQL descartável e `pnpm check` passaram; sem shape Electric ou suporte de leitura offline. Ver [N03](03-api-campainha.md).

28/10/2026 — N04 concluída: VAPID server-only, inscrição por dispositivo, worker concorrente com lease/retry/recovery e revogação foram implementados e validados com transporte controlado em PostgreSQL descartável. `pnpm check`, empty install, restore e Drizzle passaram. Push real não foi enviado; confirmação externa perdida ainda pode gerar duplicata. Logout/desinscrição será ligado à interface na N05. Ver [N04](04-worker-subscriptions.md).

28/10/2026 — N05 concluída: o proprietário confirmou a validação funcional completa no front, incluindo interface/PWA, acessibilidade, temas, viewports, atualização/offline, partição e clique. Em Preview HTTPS temporário, a API aceitou a inscrição (`PUT 200`) e o proprietário confirmou a exibição de push real. Ver [N05](05-interface-pwa.md).

28/10/2026 — N06 concluída: `pnpm check`; integrações auth/workspaces/parks/issues; instalação vazia, restart, grants, upgrade e restore passaram. A matriz de notificações confirmou isolamento por tenant, autor e membership revogada, leitura individual, múltiplos dispositivos, supressão antes do claim, retry e recuperação de worker. Falha simulada após aceite externo confirmou o limite at-least-once sem duplicar intenções no banco. Limites móveis/de produção permanecem no roadmap 11. Ver [N06](06-validacao-integrada.md).

30/10/2026 — Correção após relato do proprietário: Edge retornava HTTP 400 na inscrição, enquanto Chrome funcionava. O backend rejeitava endpoints Web Push `*.notify.windows.com`; o allowlist agora admite somente esse domínio exato ou seus subdomínios, mantendo HTTPS e sem credenciais/portas alternativas. `pnpm check` pendente; confirmação funcional no Edge ainda depende de nova tentativa do proprietário.
