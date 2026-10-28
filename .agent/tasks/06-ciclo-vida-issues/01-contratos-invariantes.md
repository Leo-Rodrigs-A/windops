# L01 — Contratos e invariantes

## Status

Planejada

- [ ] Task concluída

## Objetivo

Definir a matriz de transições e contratos sem alterar as regras aprovadas.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada; esta task ainda não foi executada. Diagnóstico e regras no índice da slice.

## Dependências

Slices 04 e 05. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [ ] Definir comandos reopen, archive, reactivate e restore-report com commandId, expectedRevision e validação estrita; restauração recebe ID do evento de origem, nunca um snapshot confiado ao cliente.
- [ ] Documentar permissões: só admin reabre, reativa e restaura; criador arquiva somente própria Pendente; admin arquiva Pendente/Em andamento; ninguém arquiva Concluída.
- [ ] Definir arquivo como dimensão separada do atendimento, eventos e metadados necessários. Reativação retorna Pendente sem responsável; reabertura limpa relato atual e preserva eventos.
- [ ] Resolver a incompatibilidade atual: constraint exige relato nulo em Pendente, mas restauração não muda status. Especificar estados elegíveis e ajuste de constraint para restauração em Pendente, sem concluir implicitamente; preservar autoria anterior no log.
- [ ] Documentar proposta de novas ações somente online nesta slice, incluindo arquivo pelo criador; não ampliar silenciosamente a fila offline. Conciliar com proprietário se desejar essas ações offline.
- [ ] Definir comportamento para equipamentos arquivados: proposta é bloquear reabertura/reativação até restaurar equipamento, sem mover localização automaticamente; confirmar qualquer regra de produto ainda ambígua antes de codificar.

## Contratos e dados afetados

Contratos compartilhados, matriz de permissões e .agent/database.md; sem migração aplicada nesta task.

## Testes e aceite

Testes de contratos válidos/inválidos, limites, campos extras e tabela de transições; decisões ambíguas registradas antes de L02. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.
