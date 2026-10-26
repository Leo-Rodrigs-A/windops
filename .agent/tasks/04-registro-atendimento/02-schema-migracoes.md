# I02 — Schema, migrações e privilégios

## Status

Planejada

- [ ] Task concluída

## Objetivo

Persistir chamados, histórico e recibos atômicos com integridade tenant e retenção de associações.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

I01 concluída, incluindo decisões do agregado. Ver [índice da slice](README.md).

## Escopo e exclusões

Schema/migrações e permissões mínimas; sem habilitar replicação ou endpoints.

## Plano de implementação

- [ ] Criar migrações incrementais após 0004, sem reescrever migrations aplicadas; separar ownership issues/audit/sync e manter journal/snapshots coerentes.
- [ ] Adicionar FKs compostas tenant para localização, issue/eventos e atores históricos; revogação de membership não remove autor. Impedir exclusão em cascata de issues/eventos.
- [ ] Modelar referências históricas de equipamento consultáveis e protegidas por integridade referencial, inclusive antes/depois de mudança de localização. JSON isolado sem proteção não basta para decidir exclusão.
- [ ] Adicionar checks de texto, revisão e consistência estado/responsável, índices de lista/histórico e unicidade dos recibos por escopo definido em I01.
- [ ] Garantir append-only para eventos pelo papel runtime (INSERT/SELECT, sem UPDATE/DELETE), ajustando default grants excessivos; recibos privados sem acesso Electric.
- [ ] Validar instalação vazia, dupla migração, upgrade desde 0004 preservando catálogo e contas, restart, restore e grants; aplicar em dev apenas após integração descartável, sem inventário fictício.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Executar pnpm check, db:empty-check, db:restore-check e db:permissions, adequando fixtures para as tabelas novas.
- [ ] Provar rejeição de FK cruzada, exclusão de equipamento com referência atual/histórica, estado inconsistente e alteração de evento pelo runtime. Registrar separadamente validação descartável e aplicação dev.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.
