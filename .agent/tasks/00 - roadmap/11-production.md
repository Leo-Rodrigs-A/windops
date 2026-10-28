# 11-production: Validação móvel e produção

## Status

Planejada

Follow-up registrado em 28/10/2026: a S09 foi concluída para browser/desktop. O proprietário transferiu validação Android/iPhone, restart físico e HTTPS em aparelho para esta etapa. Não declarar suporte móvel antes dessas evidências.

## Objetivo e escopo

Validar aparelhos reais, limites storage, OAuth/Resend/push reais, Neon replication, VPS, domínio, backups, migrations/rollback, proteção main e monitoramento. Habilitar deploy somente após checklist aprovado.

## Dependências

01–10

## Critérios de aceite

Fluxo completo campo-equipe testado; medição de <2s em cenário definido; plano operacional para meta 99,5%; restauração de backup exercitada; sem promessa de background sync garantido.

## Testes

Android/iPhone, suspensão/retomada, expiração, conflito e remoção; deploy com falha, migration idempotente, restauração e rollback compatível; verificar que Electric não está público.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
