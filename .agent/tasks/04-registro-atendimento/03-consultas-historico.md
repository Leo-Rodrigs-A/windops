# I03 — Consultas autorizadas e histórico

## Status

Planejada

- [ ] Task concluída

## Objetivo

Permitir leitura tenant-scoped de chamados e eventos e fornecer consultas públicas de associação histórica para parks.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

I01 e I02 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Listagem operacional mínima e histórico de leitura; busca avançada e histórico de filtros ficam na etapa 10.

## Plano de implementação

- [ ] Implementar GET lista/detalhe/eventos com sessão completa e membership ativa em cada requisição, para ambos os cargos; validar combinações workspace/parque/turbina.
- [ ] Aplicar paginação determinística e filtros de I01; cursor externo e recurso externo não revelam existência. Não confiar em filtros SQL do cliente.
- [ ] Expor criador, responsável, localização e eventos com dados públicos mínimos de identidade; preservar leitura após revogação do autor e preparar rótulo Usuário excluído sem implementar exclusão global.
- [ ] Expor serviço público de issues para verificar referências atuais e históricas de equipamento usando a conexão transacional recebida; audit mantém leitura/escrita interna dos próprios dados.
- [ ] Manter issues existentes consultáveis quando equipamento é arquivado; não remover registros por join que filtra apenas catálogo ativo.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Integrar com PostgreSQL real descartável: dois tenants, admin/técnico, órfão, sessão incompleta, revogação, IDs combinados, páginas empatadas por data e autor removido.
- [ ] Validar catálogo renomeado/arquivado e associação histórica após mudança de localização; executar pnpm check.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.
