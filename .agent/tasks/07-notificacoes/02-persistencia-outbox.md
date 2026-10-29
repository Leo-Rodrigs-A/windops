# N02 — Persistência e outbox transacional

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Persistir notificações e trabalho de entrega atomicamente com o evento.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Migration 0012, journal, serviço público e emissão transacional integrados. Instalação vazia/upgrade e integração de issues passaram em banco descartável e o banco de desenvolvimento persistente recebeu a migration.

## Dependências

N01.

## Plano

- [x] Modelar notifications por destinatário/evento, push_subscriptions e notification_deliveries com integridade tenant, unicidade, índices, estados, tentativas, lease e próximo retry.
- [x] Expor serviço público de notifications que recebe a transação; integrar emissão em issues/audit sem imports de schema/repositório de outro módulo.
- [x] Gravar evento, notificação/intenção e recibo na mesma transação; rollback não deixa entrega e replay não repete destinatários. Não gerar notificações retroativas na migração.
- [x] Permitir cancelar push e aviso interno de criação enquanto ainda não foram publicados/reivindicados; preservar ambos os logs e serializar cancelamento com o claim do worker.
- [x] Validar instalação vazia, upgrade preservando dados, reaplicação, constraints e grants em bancos descartáveis; não publicar subscrições/outbox no Electric.

## Contratos e dados afetados

Schema/migration, serviço público e pontos transacionais de emissão.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026 — Migration `0012_notifications_outbox` adiciona `notifications`, `push_subscriptions` e `notification_deliveries`, FKs tenant, unicidades, estados, leases e índices. Serviço público registra avisos por membro ativo, exclui o ator e enfileira uma entrega por subscrição ativa na mesma transação da auditoria. Conclusão suprime avisos internos de criação ainda não lidos e cancela entregas push ainda pendentes; logs append-only permanecem intactos. Replay de recibo não volta a emitir eventos. A integração `pnpm test:issues-integration` passou em PostgreSQL descartável, inclusive isolamento por ator, retries e cancelamento. `pnpm db:empty-check` passou instalação vazia, repetição, upgrade desde 0004, restart, grants de runtime e allowlist Electric; `pnpm db:restore-check` confirmou restore com 12 migrations. `drizzle-kit check` e `pnpm check` passaram (54 testes e builds). `pnpm db:permissions` isolado não passou porque o banco dev persistente está na migration 0011; não foi atualizado. Sem worker/claim real nesta task — será implementado na N04; updates condicionais em `pending` serializam cancelamento com claim futuro. Nenhuma tabela de notificações/outbox é publicada no Electric.

Atualização após a N04 — 28/10/2026: por solicitação do proprietário, `pnpm db:migrate` aplicou `0012_notifications_outbox` no PostgreSQL dev persistente. `pnpm db:permissions` passou: runtime DML, migration DDL e allowlist de replicação verificados. Nenhum registro de negócio foi populado pela migration.
