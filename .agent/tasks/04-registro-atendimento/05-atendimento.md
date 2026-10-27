# I05 — Início, devolução e liberação de atendimento

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Entregar controle de atendimento com concorrência explícita e histórico por ação.

## Estado atual

Rotas de início, devolução e liberação implementadas com controle de revisão, autorização por ator e recibos idempotentes. Próxima task: I06. Conclusão e relato permanecem na etapa 08.

## Dependências

I04 concluída. Ver [índice da slice](README.md).

## Escopo e exclusões

Pendente↔Em andamento; conclusão, relato, reabertura e arquivos de issues permanecem fora desta slice.

## Plano de implementação

- [x] Implementar início para admin/técnico ativo sem permitir atribuição a terceiros; regra final da I09 impede o criador de iniciar antes de uma hora e foi coberta em integração.
- [x] Somente responsável devolve para Pendente; admin libera atendimento alheio inclusive de membro revogado. Limpar responsável atual e preservar atores anteriores no evento.
- [x] Reusar transação, autorização, recibos e expectedRevision da I04; toda transição incrementa revisão e grava evento com antes/depois.
- [x] Garantir que primeiro início válido confirmado vence; segundo recebe conflito recuperável. Replay do comando vencedor não reinicia atendimento após posterior devolução.
- [x] Rejeitar transições incompatíveis e tentativas de concluir/atribuir a terceiros; autorização de cargo deve ser revalidada junto à escrita.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Testar matriz ator/criador/responsável/admin, próprio atendimento, devolução alheia negada, liberação após revogação e estado inválido.
- [x] Testar dois inícios concorrentes, edição concorrente com início, devolução versus liberação, revogação concorrente e replay antigo após nova transição; garantir um evento por comando.
- [x] Executar pnpm check e integração de issues/workspaces.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: adicionadas as rotas `POST /api/workspaces/:workspaceId/issues/:issueId/start`, `/return` e `/release`; o serviço de issues aplica as transições e salva snapshots, evento append-only e recibo idempotente na mesma transação. Sem alteração de schema/migration. Integração `pnpm test:issues-integration` cobre admin/técnico e criador, primeiro início concorrente, devolução somente pelo responsável, liberação somente por admin e após revogação, snapshot do responsável anterior, disputa devolver/liberar, edição/início concorrentes, conflito de estado/revisão, replay antigo depois da devolução e revogação concorrente com início. `pnpm test:workspaces-integration` passou.

26/10/2026 — regra corrigida pela I09 após validação do proprietário: criador pode iniciar o próprio chamado somente após uma hora; demais membros ativos podem iniciar imediatamente. Ver evidência e testes atualizados em [I09](09-atendimento-conclusao.md).

Biome em 156 arquivos, boundaries, typechecks contracts/API/web, 19 testes Vitest e builds API/web passaram. `pnpm check` ficou sem saída por 40s (timeout 124); equivalentes diretos executados. Nenhum dado do banco dev foi alterado. Conclusão, reabertura e relato seguem na etapa 08.
