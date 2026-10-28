# L03 — Comandos de ciclo de vida

## Status

Planejada

- [ ] Task concluída

## Objetivo

Entregar transições autorizadas, auditadas e idempotentes.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada; esta task ainda não foi executada. Diagnóstico e regras no índice da slice.

## Dependências

L01 e L02. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [ ] Implementar rotas e serviços para reabrir, arquivar e reativar com sessão completa e membership revalidada dentro da transação.
- [ ] Gravar mudança, incremento de revisão, evento antes/depois e recibo de comando na mesma transação; replay reautoriza e payload divergente é rejeitado.
- [ ] Serializar com edição, atendimento, conclusão, revogação e lifecycle de parque/turbina seguindo a ordem de locks existente; conferir a issue após locks.
- [ ] Rejeitar mutações operacionais em arquivadas, inclusive comandos offline antigos; preservar conteúdo local para resolução/exportação.
- [ ] Garantir que reabrir limpa o relato atual conforme regra existente e preserva eventos anteriores para consulta/auditoria.

## Contratos e dados afetados

Serviços públicos issues/audit/parks/workspaces e recibos sync; sem imports internos entre módulos.

## Testes e aceite

Matriz admin/criador/outro técnico, tenant alheio, sessão incompleta, revisão antiga, retry pós-commit, revogação e corridas com conclusão/arquivo/equipamento; contagem única de evento/recibo. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.
