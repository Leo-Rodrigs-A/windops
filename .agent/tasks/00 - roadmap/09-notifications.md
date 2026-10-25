# 09-notifications: Campainha e Web Push

## Status

Planejada

## Objetivo e escopo

Outbox de entrega na transação, worker do monólito, campainha individual, leitura/não lida, subscriptions e VAPID.

## Dependências

04, 07, 08

## Critérios de aceite

Um push por criação; excluir autor; outros eventos internos; criação+conclusão offline recebidas juntas só aviso interno de conclusão; retries não duplicam; sem e-mails de eventos.

## Testes

Falhas/retry, subscription expirada, dois aparelhos, permissão negada, iPhone instalado, lote offline concluído, eventos entre workspaces.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
