# L06 — Validação integrada e encerramento

## Status

Planejada

- [ ] Task concluída

## Objetivo

Comprovar o lifecycle completo e registrar limites reais.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada; esta task ainda não foi executada. Diagnóstico e regras no índice da slice.

## Dependências

L01–L05. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [ ] Executar pnpm check; investigar travamento recorrente do launcher e registrar diagnóstico. Se indisponível, executar componentes diretos com comandos/resultados explícitos, sem declarar check aprovado.
- [ ] Executar integrações auth/workspaces/parks/issues e PostgreSQL/Electric, migrations/upgrade/restore e permissões conforme mudanças; usar bancos descartáveis.
- [ ] Cobrir concluir→reabrir→restaurar relato sem concluir, arquivar→reativar, bloqueio de Concluída, equipamento inativo, revogação e corridas.
- [ ] Exercitar nova interação entre duas sessões: edição offline pendente versus arquivo remoto, restart, retry com resposta perdida e reconciliação sem duplicar eventos.
- [ ] Regressar espera de uma hora pelo relógio do banco e edição de relato apenas offline antes do envio; não repetir toda bateria S06–S09 já aceita sem risco novo.
- [ ] Atualizar evidências, índice, arquitetura, memória e roadmap somente após validação; Android/iPhone/HTTPS e evicção real continuam na produção, sem declarar suporte móvel.

## Contratos e dados afetados

Testes de integração e documentação de entrega; notificações permanecem fora do escopo.

## Testes e aceite

Nenhuma pendência perdida; histórico imutável; permissões tenant e idempotência comprovadas; limitações e aceite funcional registrados. Sugerir commit da entrega real. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.
