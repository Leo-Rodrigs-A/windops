# Slice 07 — Campainha e Web Push

## Status

Planejada em 28/10/2026.

- [ ] Slice concluída

## Resultado esperado

Membros recebem avisos individuais dos eventos de issues e podem marcá-los como lidos. Criação gera push aos demais membros elegíveis; outros eventos ficam na campainha. Entregas têm intenção durável e retry recuperável.

## Análise da base

Slices 01–06 registradas como concluídas para seus respectivos escopos. Inspeção: `notifications/index.ts` está vazio; `platform/push.ts` apenas envia via web-push; Bell está desativada; audit recebe a transação de issues e persiste eventos. Há journal e sender offline, mas envio por comando, sem fronteira de lote. Esta slice implementa a [etapa 09](<../00 - roadmap/09-notifications.md>), dependente do lifecycle entregue.

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
- [ ] [N05 — Campainha e integração PWA](05-interface-pwa.md) — N03/N04; referência visual confirmada.
- [ ] [N06 — Validação integrada e encerramento](06-validacao-integrada.md) — N01–N05.

## Aceite da slice

- [ ] Evento e intenção de notificar são atômicos; retry não duplica avisos no banco.
- [ ] Destinatários, canais e regra de lote respeitam a matriz N01.
- [ ] Leitura e subscrições isoladas por usuário/tenant; revogação tratada.
- [ ] Worker recupera falhas/restart e descarta endpoints expirados.
- [ ] Campainha e push real validados no front; limites externos documentados.

## Evidências

28/10/2026: planejamento baseado em roadmap, memória, arquitetura, schema documentado e inspeção de notifications, adaptador push, audit, sender e Bell. Nenhuma fonte, migration ou infraestrutura alterada; testes de aplicação não executados.

28/10/2026 — N02 concluída: migration 0012, emissão transacional de notificações, intenção push e cancelamento após conclusão implementados; integração issues, instalação vazia, upgrade, grants, restore, Drizzle e `pnpm check` passaram. Migration aplicada ao banco dev persistente por solicitação explícita e `pnpm db:permissions` passou. Ver [N02](02-persistencia-outbox.md).

28/10/2026 — N03 concluída: API online da campainha com DTO mínimo, paginação/cursor estável, contagem não lida e leitura idempotente autorizada. Integração PostgreSQL descartável e `pnpm check` passaram; sem shape Electric ou suporte de leitura offline. Ver [N03](03-api-campainha.md).

28/10/2026 — N04 concluída: VAPID server-only, inscrição por dispositivo, worker concorrente com lease/retry/recovery e revogação foram implementados e validados com transporte controlado em PostgreSQL descartável. `pnpm check`, empty install, restore e Drizzle passaram. Push real não foi enviado; confirmação externa perdida ainda pode gerar duplicata. Logout/desinscrição será ligado à interface na N05. Ver [N04](04-worker-subscriptions.md).
