# Q01 — Regras de consulta e matriz de compatibilidade

## Status

Concluída em 30/10/2026 (entrega documental).

- [x] Task concluída

## Objetivo

Consolidar a semântica comum das listas antes de alterar API, projeções e interface, reaproveitando o que já foi entregue.

## Escopo e exclusões

Regras e contratos da [slice 08](README.md). Task documental; não implementar UI, migração ou nova infraestrutura. Não adicionar busca global, filtro por data ou novos estados de issue.

## Estado atual

API aceita os filtros planejados. Home e Histórico usam helpers locais com semântica diferente da consulta remota; Arquivados é online. A API ordena conforme a lista, mas a UI usa criação em merges de concluídas. As regras abaixo foram consolidadas em Q01; as correções de execução e sua validação permanecem em Q02–Q05.

## Dependências

Slices 05–07 concluídas; leitura do índice desta slice e das decisões de offline/lifecycle na memória.

## Plano

- [x] Registrar matriz por lista: estados incluídos/excluídos, filtro P/T, campo de ordenação, desempate, origem dos dados e indicação de cobertura parcial. Preservar a ordem e os limites definidos no índice.
- [x] Fixar a precedência entre revisão remota, ACK e comando local ainda não resolvido. Conclusão pendente é visível no Histórico; rejeição/conflito conserva texto e acesso pela Cloud sem fingir conclusão confirmada.
- [x] Distinguir `serverActive=false`, `archivedAt` e `status=completed`: tombstone sozinho informa saída do conjunto ativo, não a causa nem exclusão física. Registrar como apresentar estado ainda desconhecido até revalidação.
- [x] Definir filtro pela localização atual projetada da issue; não por qualquer localização antiga do log. Equipamentos arquivados permanecem consultáveis nas listas históricas. Parque/turbina incompatíveis não retornam dados.
- [x] Manter `limit` padrão 25/máximo 100, cursor UUID e resposta atual. Documentar reset ao trocar filtro, recuperação limitada de `INVALID_CURSOR` e ausência de garantia de snapshot durante mutações concorrentes.
- [x] Definir chave de consulta por conta/workspace/lista/filtros e proteção contra resposta antiga. Busca textual opera apenas sobre resultados carregados e isso deve ficar explícito.
- [x] Descrever retenção abrangendo projeções da API e réplica, isenção dos comandos não resolvidos e dependências, além de compatibilidade com bancos IndexedDB existentes. Consulta filtrada/página isolada nunca comprova snapshot completo.
- [x] Atualizar memória/arquitetura com as regras fechadas, mantendo implementação como pendente. Registrar divergência de produto apenas se a inspeção revelar decisão nova necessária.

## Contratos e dados afetados

`IssuesQuery`, `IssuesPage`, projeções locais e metadados de consulta. Preservar contratos públicos atuais; caso algum campo adicional seja indispensável, explicitar compatibilidade nesta task antes da implementação. Nenhuma escrita em banco.

## Testes e aceite

Matriz cobre cache frio/quente, pendência, arquivo, reabertura, revisão atrasada, cursor inválido e troca de conta. Conferir links e consistência documental. Testes da aplicação não são necessários se a task permanecer documental; mudanças de fonte exigem `pnpm check`.

## Evidências

28/10/2026 — Task criada a partir da inspeção estática. Regras ainda precisam ser consolidadas durante Q01; nenhum aceite de implementação atribuído aos testes anteriores.


## Regras consolidadas

Esta seção é normativa para Q02–Q05; não descreve correções já entregues na aplicação. Não altera permissões ou lifecycle.

### Matriz das listas

| Lista      | Inclusão e exclusão                                                                                                                                                                                          | Filtros                                            | Ordem decrescente e desempate                                                                          | Origem e cobertura                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Home       | `pending` e `in_progress` sem `archivedAt`; criação local durável entra como pendente de envio. Excluir concluídas, arquivos e saída de shape sem causa conhecida                                            | `active` (padrão), `pending` ou `in_progress`, P/T | `createdAt`, depois `id`; criação sem data remota usa instante persistido da criação local até ACK     | Réplica ativa + projeção de comandos + páginas HTTP; informar preparação/cache desatualizado enquanto snapshot não estiver completo |
| Histórico  | `completed` sem `archivedAt`, ou conclusão local elegível ainda não resolvida, identificada como pendente. Excluir arquivo, reabertura conhecida e conclusão rejeitada/conflitante como resultado confirmado | Estado fixo `completed`, P/T                       | `updatedAt` remoto, depois `id`; conclusão pendente usa `createdAt` do comando de conclusão persistido | API sob demanda + cache + conclusão local; offline sempre parcial, inclusive quando vazio                                           |
| Arquivados | `archivedAt` conhecido não nulo, independentemente do estado operacional; excluir reativados                                                                                                                 | Estado de consulta `archived`, P/T                 | `archivedAt`, depois `id`                                                                              | API online paginada; sem consulta offline prometida                                                                                 |

`archived` é um seletor de consulta, não um novo estado operacional. O timestamp de conclusão local não muda ao editar relato, tentar envio ou receber página. Após ACK usa-se a data autoritativa. Todos os empates usam comparação consistente de UUID descendente, também nos merges locais. Deduplicar por ID antes de ordenar.

### Revisão, ACK e pendências

1. A base confirmada é a maior revisão conhecida da issue na mesma partição, recebida por API, réplica ou `acknowledgedIssue`. ACK comprova a aceitação daquele comando; ACK atrasado nunca reverte uma revisão mais nova (inclusive reabertura/reativação). Mesma revisão não reaplica efeitos nem duplica entradas; divergência de conteúdo exige revalidação, sem sobrescrita arbitrária.
2. Aplicar sobre a base apenas a cadeia local durável ainda elegível, em ordem de dependências. Conclusão pendente sobre base antiga em andamento aparece no Histórico com indicação de envio pendente. ACK não reaplica seu próprio comando; sucessores permanecem projetados. Relógio local nunca concede autorização ou supera revisão remota.
3. Revisão concorrente incompatível exige conflito, não reaplicação silenciosa. Comando rejeitado/conflitante e descendentes bloqueados conservam payload, relato, base e referências na Cloud para revisão/exportação; não afirmam conclusão confirmada. A lista apresenta o estado remoto conhecido, quando classificável.
4. `serverActive=false` indica somente saída do conjunto ativo. Não comprova conclusão, arquivo nem exclusão física. Sem status/ACK conclusivo e sem `archivedAt`, retirar da lista ativa, não inserir no Histórico/Arquivados e apresentar no acesso local o estado “Aguardando atualização do estado”, preservando último estado como desatualizado e o acesso à Cloud. Revalidar pelo detalhe autorizado ao retomar conexão; falha/404 não apaga trabalho local nem prova exclusão física.
5. Tombstone com ACK de conclusão pode encerrar espera da réplica, mas a classificação vem do ACK e respeita revisão superior já conhecida. Pendência elegível continua visível como local mesmo sem causa remota conhecida; conflito exige resolução. Reabertura/reativação observada com revisão superior remove a classificação histórica antiga.

### Localização, paginação e isolamento

Filtrar por `parkId`/`turbineId` da localização atual projetada, nunca por referências antigas dos eventos. Edição local elegível muda o filtro imediatamente; conflito usa localização remota na lista e preserva a proposta na Cloud. Seleção de turbina na UI depende do parque; trocar parque limpa turbina, páginas e cursor. Catálogo arquivado permanece selecionável para consultas históricas. A API mantém filtros P/T independentes; combinação incompatível, inexistente ou de outro tenant retorna conjunto vazio sem revelar existência. Sessão completa e membership ativa são revalidadas a cada chamada.

Preservar `IssuesQuery`, `IssuesPage = { items, nextCursor }`, limite padrão 25/máximo 100 e cursor UUID. Não adicionar campo público ou migration PostgreSQL nesta task. `nextCursor=null` encerra aquela consulta, não comprova snapshot global. Não usar cursor de item local ou do merge: continuação utiliza exclusivamente `nextCursor` remoto.

Chave canônica de consulta: conta + workspace + lista + estado + parque (ou ausência) + turbina (ou ausência) + limite. Cursor identifica a página dentro da chave; uma geração monotônica distingue reinícios da mesma consulta. Troca de chave ou atualização manual limpa páginas/cursor, invalida requisições anteriores e inicia a primeira página. Validar partição e geração antes de exibir ou persistir resposta; abortar fetch é auxiliar, não substitui essa verificação. Busca textual é aplicada só aos itens carregados, com indicação explícita; não vira filtro global da API nem prova que não existem outros resultados.

Em `400 INVALID_CURSOR`, invalidar a sequência e reiniciar automaticamente da primeira página no máximo uma vez por tentativa de continuação. Se falhar novamente, mostrar erro e ação explícita de atualizar, sem loop. Falhas de rede preservam resultados da consulta atual com indicação desatualizada; 401/403 seguem renovação/revogação existentes, sem continuar paginação. Cursor é resolvido no mesmo tenant/filtro. Mutação pode remover o cursor ou alterar sua posição; não há snapshot consistente entre páginas nem garantia de ausência de omissões durante concorrência. Deduplicar IDs e oferecer atualização desde o início; nunca preencher lacunas varrendo todo o histórico automaticamente.

### Retenção e compatibilidade

API e réplica compartilham o orçamento da partição: até 250 issues inativas e 1.000 eventos inativos não protegidos, contando cada ID uma vez. Reter os mais recentes por atualização/ocorrência e ID, removendo primeiro os mais antigos. Dados ativos e dependências de comandos não resolvidos são isentos e podem exceder o orçamento: pendentes, enviando, aguardando sessão/elegibilidade/réplica, rejeitados e conflitos. Preservar texto, relato, identidade mínima, localização, base/remoto e cadeia necessários a revisão, retry e exportação; poda não elimina recibos ou comandos como efeito colateral.

Poda abrange projeções recebidas só pela API, mesmo sem linha de réplica, e mantém referências/projeções/metadados consistentes em transação local. Preservar informação mínima de revisão conhecida para não ressuscitar versão obsoleta por resposta tardia. Consulta filtrada, página isolada, última página e ausência em HTTP nunca tornam outras issues inativas. Somente o percurso completo e autorizado da réplica comprova snapshot do conjunto correspondente.

Manter journal e partição conta/workspace existentes. Evolução necessária em Q03 será aditiva, com leitura de registros antigos e sem apagar/recriar banco. Para data local ausente, derivar do comando persistido; cobertura ausente significa desconhecida/parcial, nunca completa. Cache vazio difere de lista comprovadamente vazia; cache quente pode estar desatualizado. Falha de commit/quota pode deixar resposta online visível como não salva, mas não permite anunciar persistência nem limpar fila. Retomar store após restart deve preservar essas distinções.

### Matriz de aceite para execução posterior

| Cenário                                                      | Resultado exigido                                                                     | Validação responsável |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- | --------------------- |
| Cache frio offline / quente offline                          | Aviso de cache indisponível / parcial; nenhuma promessa de histórico completo         | Q03/Q04/Q05           |
| Mais de 25 itens, empates, P/T incompatíveis                 | Páginas ordenadas/deduplicadas; combinação incompatível vazia                         | Q02/Q04               |
| Conclusão local, restart, ACK e tombstone em ambas as ordens | Uma entrada, relato preservado, pendente até confirmação, data autoritativa após ACK  | Q03/Q05               |
| Tombstone sem causa / arquivo conhecido                      | Estado aguardando atualização / somente Arquivados online; nenhuma conclusão inferida | Q03/Q04               |
| Reabertura/reativação, ACK ou página atrasada                | Maior revisão prevalece; estado histórico antigo não reaparece                        | Q03/Q05               |
| Rejeição/conflito com descendentes                           | Texto exportável na Cloud, sem confirmação falsa                                      | Q03/Q05               |
| Cursor removido ou movido entre páginas                      | Reset limitado ou deduplicação; concorrência não é snapshot                           | Q02/Q04               |
| Troca de filtro, conta ou workspace com fetch em voo         | Resposta antiga não aparece nem grava na partição atual                               | Q04/Q05               |
| API acima do limite, réplica mista, quota e restart          | Poda coerente; pendências intactas; falha não é persistência                          | Q03/Q05               |
| Página final ou filtrada omite outra issue ativa             | Outra issue permanece ativa; nenhum snapshot global inferido                          | Q03/Q05               |

30/10/2026 — Q01 concluída por inspeção estática dos contratos, serviço de issues, journal e helpers de listas. Matriz e precedência consolidadas sem nova decisão de produto, dependência ou contrato público. Verificação documental de links locais e `git diff --check` aprovadas. Sem alteração de fonte/infra/banco/design; `pnpm check`, integrações e testes da aplicação não executados. A matriz acima é aceite futuro, não evidência de comportamento implementado. Próxima task: Q02.
