# I06 — Exclusão, arquivamento e restauração de equipamentos

## Status

Planejada

- [ ] Task concluída

## Objetivo

Concluir o lifecycle de equipamentos adiado na slice 03, preservando todos os vínculos com chamados.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

I01–I05 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Comandos admin para parks/turbines; não arquiva, conclui ou reativa issues.

## Plano de implementação

- [ ] Implementar comandos explícitos com revisão, recibo idempotente e resultado discriminado excluído/arquivado. Restauração só para recurso arquivado; técnico nunca escreve.
- [ ] Sem nenhuma associação atual ou histórica, excluir definitivamente turbina; para parque considerar agregado inteiro e remover dependências sem deixar órfãos. Com qualquer associação, arquivar preservando recursos e histórico.
- [ ] Aplicar decisão registrada em I01 sobre atividade herdada, turbinas individualmente arquivadas e restauração; não reativar implicitamente equipamentos que já estavam arquivados.
- [ ] Usar serviços públicos de issues/audit e parks, sem imports privados ou consultas SQL diretas às tabelas de outro módulo; composição transacional explícita sem dependência circular de inicialização.
- [ ] Serializar exclusão/arquivo com criação e mudança de localização de issue, e arquivo de parque com cadastro/edição/restauração de turbina. Revisar consultas e comandos existentes da slice 03 para atividade efetiva.
- [ ] Preservar unicidade de código arquivado; registrar ator e resultado do lifecycle de equipamento em registro durável apropriado definido em I01, sem inventar uma issue para auditá-lo.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Testar parque vazio, com turbinas sem histórico, com issue em uma turbina, equipamento somente referenciado no histórico e combinações de arquivo/restauração de pai/filha.
- [ ] Exercitar ambos os resultados das corridas criação/edição versus exclusão/arquivo e criação/restauração de turbina versus arquivo de parque; verificar rollback integral, ausência de órfãos/deadlocks e novas issues negadas em localização inativa.
- [ ] Testar retry após exclusão física usando recibo autorizado, revisão obsoleta, isolamento tenant e permissões; executar pnpm check e integrações issues/parks.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.
