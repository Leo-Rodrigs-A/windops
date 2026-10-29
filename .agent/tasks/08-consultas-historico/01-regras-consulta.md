# Q01 — Regras de consulta e matriz de compatibilidade

## Status

Planejada.

- [ ] Task concluída

## Objetivo

Consolidar a semântica comum das listas antes de alterar API, projeções e interface, reaproveitando o que já foi entregue.

## Escopo e exclusões

Regras e contratos da [slice 08](README.md). Task documental; não implementar UI, migração ou nova infraestrutura. Não adicionar busca global, filtro por data ou novos estados de issue.

## Estado atual

API aceita os filtros planejados. Home e Histórico usam helpers locais com semântica diferente da consulta remota; Arquivados é online. A API ordena conforme a lista, mas a UI usa criação em merges de concluídas. As decisões abaixo são a direção deste plano, ainda sem validação de implementação.

## Dependências

Slices 05–07 concluídas; leitura do índice desta slice e das decisões de offline/lifecycle na memória.

## Plano

- [ ] Registrar matriz por lista: estados incluídos/excluídos, filtro P/T, campo de ordenação, desempate, origem dos dados e indicação de cobertura parcial. Preservar a ordem e os limites definidos no índice.
- [ ] Fixar a precedência entre revisão remota, ACK e comando local ainda não resolvido. Conclusão pendente é visível no Histórico; rejeição/conflito conserva texto e acesso pela Cloud sem fingir conclusão confirmada.
- [ ] Distinguir `serverActive=false`, `archivedAt` e `status=completed`: tombstone sozinho informa saída do conjunto ativo, não a causa nem exclusão física. Registrar como apresentar estado ainda desconhecido até revalidação.
- [ ] Definir filtro pela localização atual projetada da issue; não por qualquer localização antiga do log. Equipamentos arquivados permanecem consultáveis nas listas históricas. Parque/turbina incompatíveis não retornam dados.
- [ ] Manter `limit` padrão 25/máximo 100, cursor UUID e resposta atual. Documentar reset ao trocar filtro, recuperação limitada de `INVALID_CURSOR` e ausência de garantia de snapshot durante mutações concorrentes.
- [ ] Definir chave de consulta por conta/workspace/lista/filtros e proteção contra resposta antiga. Busca textual opera apenas sobre resultados carregados e isso deve ficar explícito.
- [ ] Descrever retenção abrangendo projeções da API e réplica, isenção dos comandos não resolvidos e dependências, além de compatibilidade com bancos IndexedDB existentes. Consulta filtrada/página isolada nunca comprova snapshot completo.
- [ ] Atualizar memória/arquitetura com as regras fechadas, mantendo implementação como pendente. Registrar divergência de produto apenas se a inspeção revelar decisão nova necessária.

## Contratos e dados afetados

`IssuesQuery`, `IssuesPage`, projeções locais e metadados de consulta. Preservar contratos públicos atuais; caso algum campo adicional seja indispensável, explicitar compatibilidade nesta task antes da implementação. Nenhuma escrita em banco.

## Testes e aceite

Matriz cobre cache frio/quente, pendência, arquivo, reabertura, revisão atrasada, cursor inválido e troca de conta. Conferir links e consistência documental. Testes da aplicação não são necessários se a task permanecer documental; mudanças de fonte exigem `pnpm check`.

## Evidências

28/10/2026 — Task criada a partir da inspeção estática. Regras ainda precisam ser consolidadas durante Q01; nenhum aceite de implementação atribuído aos testes anteriores.
