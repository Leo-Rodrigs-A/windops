# N04 — Subscrições e worker de push

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Entregar intenções persistidas com retry recuperável no monólito.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Subscrições e worker do monólito implementados; validação PostgreSQL descartável aprovada.

## Dependências

N01–N03.

## Plano

- [x] Implementar registro/remoção idempotente por usuário/workspace/dispositivo, validando HTTPS e allowlist dos endpoints Web Push conhecidos; endpoint e chaves não são registrados em logs.
- [x] Configurar VAPID privada somente no servidor e chave pública em contrato próprio; sem segredo VITE_. GET status explicita push desabilitado quando config ausente.
- [x] Implementar claim concorrente `SKIP LOCKED`, lease, backoff limitado, recuperação de lease/restart e encerramento do worker; transação fecha antes da chamada de rede.
- [x] Revalidar membership/subscrição antes do envio; unsubscribe revoga dispositivo e cancela fila pendente. Revogação concorrente após a última checagem pode não impedir envio já em voo.
- [x] Tratar 404/410 como subscrição revogada, 429/5xx/rede como retry, falhas permanentes/limite de tentativas como dead; falha de uma entrega não interrompe as demais.
- [x] Testar dois workers, leases expiradas, recovery em nova instância, replay após erro de provedor, inscrição múltipla/idempotente, unsubscribe e endpoint rejeitado com transporte mock. Não alegar entrega real usando mock.

## Contratos e dados afetados

Worker do mesmo monólito, adaptador push e rotas de subscrição; sem Redis ou e-mail de eventos.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026 — Adicionadas rotas autenticadas de status VAPID, PUT/DELETE de subscrição por dispositivo e allowlist FCM/Mozilla/Apple, evitando SSRF por endpoint arbitrário. Subscrições guardam hash do endpoint e chaves somente no PostgreSQL; mutações revalidam membership sob lock. VAPID privada é validada no backend, nunca enviada ao cliente. Worker integrado ao ciclo Fastify usa `FOR UPDATE SKIP LOCKED`, lease, checagem de membership/subscrição, envio fora da transação, backoff, revogação 404/410 e limite de tentativas; shutdown aguarda processamento. `pnpm test:issues-integration` passou em banco descartável: dois workers concorrentes, dois dispositivos, lease expirada, 503 e retry após reiniciar o worker, inscrição repetida, unsubscribe repetido e URL localhost rejeitada. `pnpm db:empty-check`, `pnpm db:restore-check` (12 migrations), `drizzle-kit check`, `pnpm check` (54 testes/builds) e `git diff --check` passaram. Push não foi enviado a um serviço real; sem VAPID o recurso permanece desabilitado. Uma resposta perdida depois de aceitação externa ainda pode duplicar exibição; como o provedor não oferece confirmação idempotente, a garantia é at-least-once/retry limitado. Logout deve chamar unsubscribe no fluxo de UI N05. Migration 0012 foi aplicada também ao PostgreSQL dev persistente após autorização explícita; `pnpm db:permissions` passou.
