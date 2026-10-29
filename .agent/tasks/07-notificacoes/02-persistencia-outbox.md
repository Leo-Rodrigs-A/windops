# N02 — Persistência e outbox transacional

## Status

Planejada

- [ ] Task concluída

## Objetivo

Persistir notificações e trabalho de entrega atomicamente com o evento.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Planejamento; nenhuma implementação desta task executada. Diagnóstico da base no índice da slice.

## Dependências

N01.

## Plano

- [ ] Modelar notifications por destinatário/evento, push_subscriptions e notification_deliveries com integridade tenant, unicidade, índices, estados, tentativas, lease e próximo retry.
- [ ] Expor serviço público de notifications que recebe a transação; integrar emissão em issues/audit sem imports de schema/repositório de outro módulo.
- [ ] Gravar evento, notificação/intenção e recibo na mesma transação; rollback não deixa entrega e replay não repete destinatários. Não gerar notificações retroativas na migração.
- [ ] Permitir cancelar push e aviso interno de criação enquanto ainda não foram publicados/reivindicados; preservar ambos os logs e serializar cancelamento com o claim do worker.
- [ ] Validar instalação vazia, upgrade preservando dados, reaplicação, restore, constraints e grants em bancos descartáveis; não publicar subscrições/outbox no Electric.

## Contratos e dados afetados

Schema/migration, serviço público e pontos transacionais de emissão.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: task planejada; implementação e testes de aplicação não executados.
