# L03 — Comandos de ciclo de vida

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Entregar transições autorizadas, auditadas e idempotentes.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Rotas, schemas e comandos transacionais implementados; integração PostgreSQL passou.

## Dependências

L01 e L02. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [x] Implementar rotas e serviços para reabrir, arquivar e reativar com sessão completa e membership revalidada dentro da transação.
- [x] Gravar mudança, incremento de revisão, evento antes/depois e recibo na mesma transação; replay retorna resultado original.
- [x] Serializar com localização/equipamento antes de bloquear issue, seguindo a ordem parque→turbina→issue.
- [x] Rejeitar edições e transições operacionais sobre issues arquivadas.
- [x] Reabrir limpa relato/responsável e preserva eventos anteriores.

## Contratos e dados afetados

Serviços públicos issues/audit/parks/workspaces e recibos sync; sem imports internos entre módulos.

## Testes e aceite

Matriz admin/criador/outro técnico, tenant alheio, sessão incompleta, revisão antiga, retry pós-commit, revogação e corridas com conclusão/arquivo/equipamento; contagem única de evento/recibo. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: adicionados POST `/reopen`, `/archive` e `/reactivate`, schema estrito com commandId/revisão e DTO archivedAt retrocompatível. Mudanças, eventos sanitizados e recibos gravam atomicamente; retry da reabertura retorna o mesmo resultado. Arquivo respeita criador Pendente/admin Pendente ou Em andamento; concluída não arquiva. Reabertura/reativação bloqueiam equipamento inativo. Transições/edições rejeitam arquivadas. Transições de atendimento agora adquirem locks de localização antes da issue. Integração PostgreSQL descartável verificou concluir→reabrir→arquivar pelo criador→reativar, replay, acesso técnico, bloqueio de concluída, autorização, conflitos e corridas existentes. `pnpm test:issues-integration` e `pnpm check` passaram; 53 testes unitários.
