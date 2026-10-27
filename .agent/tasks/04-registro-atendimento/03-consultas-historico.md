# I03 — Consultas autorizadas e histórico

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Permitir leitura tenant-scoped de chamados e eventos e fornecer consultas públicas de associação histórica para parks.

## Estado atual

Implementada leitura tenant-scoped de issues e eventos e serviço público de referências de equipamento. Próxima task: I04.

## Dependências

I01 e I02 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Listagem operacional mínima e histórico de leitura; busca avançada e histórico de filtros ficam na etapa 10.

## Plano de implementação

- [x] Implementar GET lista/detalhe/eventos com sessão completa e membership ativa em cada requisição, para ambos os cargos; validar combinações workspace/parque/turbina.
- [x] Aplicar paginação determinística e filtros de I01; cursor externo e recurso externo não revelam existência. Não confiar em filtros SQL do cliente.
- [x] Expor criador, responsável, localização e eventos com dados públicos mínimos de identidade; preservar leitura após revogação do autor e preparar rótulo Usuário excluído sem implementar exclusão global.
- [x] Expor serviço público de issues para verificar referências atuais e históricas de equipamento usando a conexão transacional recebida; audit mantém leitura/escrita interna dos próprios dados.
- [x] Manter issues existentes consultáveis quando equipamento é arquivado; não remover registros por join que filtra apenas catálogo ativo.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Integrar com PostgreSQL real descartável: dois tenants, admin/técnico, órfão, sessão incompleta, revogação, IDs combinados, páginas empatadas por data e autor removido.
- [x] Validar catálogo arquivado e associação histórica após mudança de localização; executar pnpm check.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: adicionadas as rotas GET de lista, detalhe e eventos em `apps/api/src/modules/issues/routes.ts`; leituras, cursor composto por data/UUID e serviço transacional de referências atuais/históricas em `service.ts`; exports públicos em `index.ts`; contratos inferidos exportados em `packages/contracts/src/index.ts`; integração no app e composição de dependências em `apps/api/src/app.ts` e `server.ts`. Script descartável `apps/api/scripts/issues-read-flow.mjs`, registrado como `pnpm test:issues-read-integration`.

Validação: a integração PostgreSQL descartável passou (dois tenants, admin/técnico, órfão, sessão incompleta, membership revogada, filtros e IDs incompatíveis, paginação com timestamps empatados, ator revogado, eventos, equipamento arquivado e referências históricas na conexão transacional). Biome em 153 arquivos, boundaries, typechecks de contracts/API/web, 19 testes Vitest e builds de API/web passaram. `pnpm check` permaneceu sem saída por 40s e terminou por timeout 124; equivalentes diretos foram executados. Nenhuma migração ou dado dev alterado nesta task.
