# Slice 08 — Filtros e histórico de consulta

## Status

Planejada em 28/10/2026.

- [ ] Slice concluída

## Resultado esperado

Consultar chamados abertos, concluídos e arquivados por parque/turbina, com ordem consistente e carregamento por páginas. Abertos continuam disponíveis na réplica offline; Histórico apresenta o cache disponível e conclusões locais sem confundir dados parciais com o histórico completo. Pendências sobrevivem à limpeza de cache, reconexão e restart.

Esta slice executa as lacunas da [etapa 10 do roadmap](<../00 - roadmap/10-query.md>). Notificações foram concluídas na [slice 07](../07-notificacoes/README.md); produção e validação física móvel continuam na etapa 11.

## Análise da base

Inspeção de código em 28/10/2026; constatações estáticas, sem nova execução da aplicação:

| Área | Já existe | Lacuna a tratar |
| --- | --- | --- |
| API de issues | `status`, `parkId`, `turbineId`, limite e cursor UUID; autorização tenant; integração com filtros e páginas pequenas | Cobertura combinada das três listas, mais de uma página real e alteração do registro usado como cursor |
| Home | Estados, busca sobre itens carregados, paginação e overlay local | Seletores P/T; respostas atrasadas; páginas filtradas não podem declarar snapshot completo |
| Histórico | Consulta online e cópia de concluídas no journal | `getAllIssues` percorre todas as páginas; merge reordena por `createdAt`, embora a API use `updatedAt` para concluídas |
| Arquivados | Lista online paginada e reativação administrativa | Seletores P/T e códigos legíveis; a busca atual compara UUIDs de localização |
| Projeção local | Journal durável, ACK/revisão, conflitos e proteção de pendências | `locallyCompletedEntries` e `projectionStatus` usam `serverActive === false` como conclusão; saída do shape também pode significar arquivo |
| Retenção | Réplica limita inativos a 250 issues/1.000 eventos, preservando pendências | `recordServerIssuePage` grava projeções fora desse percurso de poda; cobrir também histórico vindo da API |

Pontos de entrada: `apps/web/src/pages/issues-pages.tsx`, `apps/web/src/offline/local-issue-store.ts`, `apps/web/src/lib/issues-api.ts`, `apps/api/src/modules/issues/service.ts`, `packages/contracts/src/index.ts` e `apps/api/scripts/issues-read-flow.mjs`.

## Dependências e limites

- Ler [arquitetura](../../architeture.md), [memória](../../memory.md) e [convenção de execução](../README.md). Depende das slices 05–07 concluídas em seus escopos documentados.
- Reutilizar rotas, serviços públicos e journal existentes. Não ampliar shapes para todo o histórico nem aceitar filtros Electric do cliente. Autorização tenant permanece obrigatória.
- Filtros desta entrega: estado já existente na Home, parque e turbina nas três listas. Turbina depende do parque; trocar parque limpa turbina e paginação. Catálogo arquivado deve continuar selecionável quando necessário para consultar histórico.
- Ordem proposta, preservando a API atual: abertos por `createdAt DESC, id DESC`; concluídos por `updatedAt DESC, id DESC`; arquivados por `archivedAt DESC, id DESC`. Conclusão pendente usa o instante local persistido da conclusão, identificado como pendente; não altera timestamps nem permissões do servidor.
- Manter cursor UUID e recuperação explícita de `INVALID_CURSOR` reiniciando a consulta; não prometer snapshot estável durante alterações concorrentes. Páginas são deduplicadas por ID; filtro/conta/workspace novos invalidam respostas antigas.
- Arquivados continuam exigindo rede. Histórico offline é parcial; não prometer consulta de registros nunca armazenados. A busca textual existente continua limitada aos itens carregados, com indicação clara; busca global e filtro por data ficam fora do escopo.
- Limites atuais de retenção são a base (250 issues inativas e 1.000 eventos inativos); dados ativos e tudo que sustenta comandos não resolvidos não podem ser descartados para cumprir esses limites.
- Sem novas regras de lifecycle, relatórios/exportação de histórico, exclusão de conta, deploy ou nova biblioteca por padrão. Nenhuma migration PostgreSQL está prevista; Q02 só a introduz se houver necessidade demonstrada e documentada. Evolução local deve preservar o journal existente.
- [Referência visual](../../design-reference.md) orienta componentes e telas já autorizados. Reconfirmar o documento pelo MCP antes de consultá-lo; não editar/copiar `.pen` nem inventar layout definitivo na ausência de referência/autorização aplicável.

## Ordem e dependências

- [ ] [Q01 — Regras de consulta e matriz de compatibilidade](01-regras-consulta.md) — slices 05–07; início da execução.
- [ ] [Q02 — Consultas paginadas e autorização](02-api-consultas.md) — Q01.
- [ ] [Q03 — Projeção e cache local de histórico](03-cache-projecao.md) — Q01/Q02.
- [ ] [Q04 — Filtros e paginação nas interfaces](04-interface-consultas.md) — Q02/Q03.
- [ ] [Q05 — Validação integrada e encerramento](05-validacao-integrada.md) — Q01–Q04.

## Aceite da slice

- [ ] Parque/turbina e estado selecionam o mesmo conjunto na API e na projeção local, respeitando a disponibilidade de cada lista.
- [ ] Páginas mantêm ordem determinística, sem duplicatas; filtros, cursor invalidado e respostas tardias têm recuperação compreensível.
- [ ] Histórico carrega sob demanda; conclusão local permanece visível após restart, ACK e saída do shape, sem duplicação.
- [ ] Arquivo/saída de shape não transforma automaticamente uma issue em Concluída; reabertura/reativação atualizam as listas.
- [ ] Retenção cobre histórico vindo da API e da réplica sem perder fila, texto, referências ou dados de conflito.
- [ ] Cache vazio, parcial, desatualizado e falha de persistência são distinguíveis; consultas não vazam entre contas/workspaces.
- [ ] Checks, integrações e percurso de front registrados; limitações móveis continuam explícitas na etapa 11.

## Evidências

28/10/2026 — Planejamento baseado no roadmap, arquitetura, memória e inspeção dos pontos de entrada acima. O índice geral ainda indicava N01 como próxima execução, embora N06/slice 07 estivessem concluídas; índice corrigido. Nenhuma task de implementação concluída, fonte alterada ou dado operacional modificado nesta preparação. A verificação documental final fica registrada no índice geral e na memória.
