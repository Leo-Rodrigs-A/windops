# 10-query: Filtros e histórico de consulta

## Status

Parcial; execução restante planejada na [slice 08 — Filtros e histórico de consulta](../08-consultas-historico/README.md), com Q01 documental concluída em 30/10/2026 e Q02 concluída (paginação validada e precisão de cursor corrigida); Q03–Q05 pendentes. Regras consolidadas na [Q01](../08-consultas-historico/01-regras-consulta.md); projeção/cache e interface ainda aguardam Q03/Q04.

Slices 04–06 já entregaram API com filtros P/T/status e cursor, Home e Arquivados paginados, cache de concluídas e proteção de pendências na réplica. Inspeção da slice 08 identificou lacunas: seletores P/T na interface, Histórico que ainda baixa todas as páginas, ordenação local diferente da API, inferência de conclusão a partir de saída do shape e retenção das projeções gravadas diretamente pela API. Evidências anteriores são contexto; o aceite desta etapa ainda está aberto.

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
