# I05 — Início, devolução e liberação de atendimento

## Status

Planejada

- [ ] Task concluída

## Objetivo

Entregar controle de atendimento com concorrência explícita e histórico por ação.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

I04 concluída. Ver [índice da slice](README.md).

## Escopo e exclusões

Pendente↔Em andamento; conclusão, relato, reabertura e arquivos de issues permanecem fora desta slice.

## Plano de implementação

- [ ] Implementar iniciar como autoatendimento para admin/técnico ativo, inclusive criador; não aceitar ID de responsável escolhido pelo cliente.
- [ ] Somente responsável devolve para Pendente; admin libera atendimento alheio inclusive de membro revogado. Limpar responsável atual e preservar atores anteriores no evento.
- [ ] Reusar transação, autorização, recibos e expectedRevision da I04; toda transição incrementa revisão e grava evento com antes/depois.
- [ ] Garantir que primeiro início válido confirmado vence; segundo recebe conflito recuperável. Replay do comando vencedor não reinicia atendimento após posterior devolução.
- [ ] Rejeitar transições incompatíveis e tentativas de concluir/atribuir a terceiros; autorização de cargo deve ser revalidada junto à escrita.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Testar matriz ator/criador/responsável/admin, próprio atendimento, devolução alheia negada, liberação após revogação e estado inválido.
- [ ] Testar dois inícios concorrentes, edição concorrente com início, devolução versus liberação, rebaixamento/revogação concorrente e replay antigo após nova transição; garantir um evento por comando.
- [ ] Executar pnpm check e integração de issues/workspaces.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.
