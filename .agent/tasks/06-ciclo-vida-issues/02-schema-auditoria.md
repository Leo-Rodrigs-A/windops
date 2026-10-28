# L02 — Persistência e auditoria

## Status

Planejada

- [ ] Task concluída

## Objetivo

Preparar armazenamento compatível com histórico e réplica.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada; esta task ainda não foi executada. Diagnóstico e regras no índice da slice.

## Dependências

L01. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [ ] Criar migration incremental para arquivo/metadados, constraints de relato/atendimento, índices e novos tipos de evento; atualizar schema e documentação do banco.
- [ ] Preservar eventos e referências históricas append-only; novos eventos de lifecycle registram snapshots antes/depois sem alterar eventos anteriores.
- [ ] Atualizar espelhos sanitizados e triggers Electric sem publicar identidade privada; definir compatibilidade com clientes antigos e recibos existentes.
- [ ] Validar instalação vazia, upgrade com issues/eventos/recibos preexistentes, reaplicação, grants e restore em banco descartável; não popular dev com fixtures.

## Contratos e dados afetados

issues, audit, espelhos Electric e migrations; decidir número da migration ao executar.

## Testes e aceite

Upgrade preserva relatos e eventos; runtime não altera eventos antigos; constraints aceitam apenas estados definidos em L01; integração/container obrigatórios. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.
