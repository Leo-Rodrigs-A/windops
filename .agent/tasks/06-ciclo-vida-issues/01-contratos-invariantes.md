# L01 — Contratos e invariantes

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Definir a matriz de transições, contratos e decisões de produto aprovadas.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada. Decisões do proprietário e matriz de ciclo de vida documentadas.

## Dependências

Slices 04 e 05. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [x] Definir comandos reopen, archive e reactivate com commandId, expectedRevision e validação estrita.
- [x] Documentar permissões: só admin reabre e reativa; criador arquiva somente issue própria Pendente; admin arquiva Pendente/Em andamento; ninguém arquiva Concluída.
- [x] Definir arquivo como dimensão separada do atendimento, eventos e metadados necessários. Reativação retorna Pendente sem responsável; reabertura limpa relato atual e preserva eventos.
- [x] Manter a regra de integridade de relato: conclusão limpa o relato ao reabrir e Pendente não retém relato de conclusão.
- [x] Documentar ações somente online nesta slice, incluindo arquivo pelo criador; fila offline não ampliada.
- [x] Bloquear reabertura/reativação enquanto o parque ou a turbina da issue estiver arquivado; não mover localização automaticamente.

## Contratos e dados afetados

Contratos compartilhados, matriz de permissões e .agent/database.md; sem migração aplicada nesta task.

## Matriz de transições e contratos

Todas as ações novas desta slice são online. Cada comando contém `commandId` UUID e `expectedRevision` positiva; schema estrito rejeita campos extras. A API deriva ator e workspace da sessão/membership autorizada, revalida membership na transação e grava mudança, evento append-only e recibo idempotente no mesmo commit. Revisão obsoleta ou transição inválida retorna conflito sem mutação. Retry do mesmo comando/payload retorna resultado original; chave repetida com payload diferente conflita.

| Ação | Permissão e pré-condição | Efeito e evento |
| --- | --- | --- |
| Reabrir issue Concluída | Admin ativo; parque e turbina ativos | Pendente, sem responsável e sem relato de conclusão; incrementa revisão; evento `reopened` com antes/depois. |
| Arquivar issue Pendente | Criador ativo ou admin ativo | Marca como arquivada, mantém status operacional e histórico; evento `archived`. |
| Arquivar issue Em andamento | Admin ativo | Marca como arquivada; mantém dados de atendimento para auditoria; evento `archived`. |
| Arquivar issue Concluída | Ninguém | Rejeitado; issue concluída nunca é arquivável. |
| Reativar issue arquivada Pendente/Em andamento | Admin ativo; parque e turbina ativos | Remove arquivo e retorna a Pendente, limpa responsável e relato; incrementa revisão; evento `reactivated`. |
| Reativar issue arquivada Concluída | Ninguém | Rejeitado; concluídas não podem ser arquivadas, portanto esse estado é inválido. |

Arquivo é dimensão separada do estado de atendimento. Reabrir e reativar são distintas: reabrir exige Concluída; reativar exige arquivada. Localização não é alterada automaticamente. Parque arquivado, turbina arquivada ou turbina sob parque arquivado bloqueiam reabertura/reativação; primeiro admin restaura o equipamento no catálogo. Edição, início, devolução e conclusão sobre issue arquivada são rejeitados. Eventos anteriores nunca são alterados; a reabertura não oferece ação de recuperar relato substituído.

## Testes e aceite

Cobertura de schema estrito/UUID/revisão e tabela de transições acima será executada nas tasks de contratos e integração correspondentes. Como L01 altera somente documentação, validar consistência, links e `git diff --check`; testes da aplicação não são necessários.

## Evidências

28/10/2026: proprietário confirmou ações online, arquivo da própria issue Pendente pelo criador e bloqueio de reabertura/reativação quando parque ou turbina estiver arquivado. Matriz de estados/permissões, efeitos, idempotência e auditoria registrada. Removida a funcionalidade de restauração de relatos do plano e das regras de produto. Conferência documental e diff-check realizados; sem mudanças de fonte/schema e sem testes da aplicação.
