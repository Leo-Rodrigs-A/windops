# 10-query: Filtros e histórico de consulta

## Status

Concluída para browser/desktop em 30/10/2026 pela [slice 08](../08-consultas-historico/README.md), Q01–Q05. Aceite funcional confirmado pelo proprietário em Chrome e Edge; limites móveis/produção continuam na etapa 11.

Slices 04–06 já entregaram API com filtros P/T/status e cursor, Home e Arquivados paginados, cache de concluídas e proteção de pendências na réplica. Inspeção da slice 08 identificou lacunas: seletores P/T na interface, Histórico que ainda baixa todas as páginas, ordenação local diferente da API, inferência de conclusão a partir de saída do shape e retenção das projeções gravadas diretamente pela API. Essas lacunas foram tratadas por Q01–Q05; ver evidências de encerramento na slice 08.

## Objetivo e escopo

Listas abertas, concluídas e arquivadas, filtros P/T, paginação e cache. Mais recentes primeiro, conforme decisão posterior registrada na memória.

A slice 08 mantém Arquivados online e Histórico offline parcial, sem ampliar os shapes para todo o histórico. Reutiliza cursor UUID com recuperação quando invalidado; busca global e filtros por data não fazem parte desta entrega. Nenhuma migration PostgreSQL está prevista sem necessidade demonstrada.

## Dependências

05–09

## Critérios de aceite

Abertas utilizáveis offline; concluídas via rede/cache existente; conclusão local não some; pendências protegidas de limpeza de cache.

## Testes

Cache frio/quente, filtros e paginação, mudança de status removendo shape, sem conexão, issue recém-concluída offline.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.


Q05 — 30/10/2026: validação automatizada executada (`pnpm check`, 57 testes/builds, e integração de issues com fixture isolada de 128 registros). Aceite integrado permanece aberto: navegador MCP Pencil indisponível por aplicativo desconectado; front autenticado, perda de rede entre páginas e saída/retorno real Electric ainda precisam de ensaio. Sem alterações de fonte, schema ou infraestrutura. Ver evidências em Q05; slice 08 e roadmap 10 não concluídos.


## Encerramento — 30/10/2026

Q05 e slice 08 concluídas no escopo browser/desktop. O proprietário confirmou o fluxo completo em Chrome e Edge, com contas administrador e técnico: permissões, interface e cache previamente aprovados; agora também início/conclusão offline, F5, reinício do navegador, reconexão/sincronização, alterações remotas e atualização do PWA com pendências, conforme roteiro fornecido. Não houve nova observação direta pelo agente nem captura de tráfego Electric; o aceite funcional da sincronização real é confirmação do proprietário.

Evidência automatizada complementar: último pnpm check aprovado com 60 testes, lint/boundaries, typecheck e builds; integração PostgreSQL de issues aprovada com 128 fixtures, filtros, paginação, autorização/isolamento entre tenants, revogação, lifecycle e idempotência. Poda, quota simulada, commit falho, conflito, restart e retry/ACK foram cobertos pelas suítes executadas. Não atribuir o ensaio cross-tenant automatizado a uma inspeção manual de dois workspaces.

Correções entregues durante Q05: isolamento do cache pelo build ativo, proteção contra worker de Preview no Vite, manifesto offline coberto por teste e mensagens corretas para ações de atendimento. Dinossauro no ensaio final foi resolvido ao desmarcar Bypass for network; não constitui defeito comprovado do handler.

As pendências de navegador registradas acima são históricas e ficam superadas por este aceite. Android/iPhone físicos, quota/evicção real e HTTPS/infraestrutura de produção permanecem na etapa 11. Nenhuma nova fonte/schema/infra alterada neste encerramento documental; não houve repetição de testes da aplicação. Próxima execução: R01 da slice 09.
