# 07-offline: Persistência e sincronização

## Status

Planejada

## Objetivo e escopo

Prova em Safari/Chrome, persistência durável TanStack DB, outbox, PWA/app shell, proxy Electric autorizado e reconciliação. Escolher persistência suportada após prova de compatibilidade.

## Dependências

03–06

## Critérios de aceite

Salvar antes de feedback; reinício preserva comandos; idempotência; tenant/account cache separado; primeiro atendimento aceito vence; conflito explícito; membro removido exporta pendências; login renovado antes de upload.

## Testes

Modo avião, fechar/reabrir, reiniciar aparelho, perda de resposta após commit, concorrência, sessão expirada, revogação, storage cheio, update service worker, isolamento de shapes.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
