# I06 — Exclusão, arquivamento e restauração de equipamentos

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Concluir o lifecycle de equipamentos adiado na slice 03, preservando todos os vínculos com chamados.

## Estado atual

Implementado em 26/10/2026 sobre I01–I05. Sem alteração de schema/migration: `sync_commands` existente registra ator e resultado do lifecycle. O predicado de issue aberta considera a localização atual; referências históricas em localização anterior preservam o equipamento, permitindo arquivar quando nenhuma issue aberta está atualmente associada.

## Dependências

I01–I05 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Comandos admin para parks/turbines; não arquiva, conclui ou reativa issues.

## Plano de implementação

- [x] Implementar comandos explícitos com revisão, recibo idempotente e resultado discriminado excluído/arquivado. Restauração só para recurso arquivado; técnico nunca escreve.
- [x] Sem nenhuma referência atual ou histórica, excluir definitivamente turbina; para parque considerar agregado inteiro e remover dependências sem deixar órfãos. Com histórico e sem issue aberta atualmente localizada, arquivar preservando recursos e histórico.
- [x] Antes de arquivar turbina, bloquear se ela tiver issue aberta atualmente associada; antes de arquivar parque, bloquear se qualquer turbina descendente tiver issue aberta. Retornar conflito explícito sem mutação.
- [x] Aplicar decisão registrada em I01 sobre atividade herdada, turbinas individualmente arquivadas e restauração; parque arquivado torna turbinas efetivamente indisponíveis e restaurá-lo não reativa turbinas antes arquivadas individualmente.
- [x] Usar serviços públicos de issues/audit e parks, sem imports privados ou consultas SQL diretas às tabelas de outro módulo; composição transacional explícita sem dependência circular de inicialização.
- [x] Serializar exclusão/arquivo com criação e mudança de localização de issue, e arquivo de parque com cadastro/edição/restauração de turbina. Revisar consultas e comandos existentes da slice 03 para atividade efetiva.
- [x] Preservar unicidade de código arquivado; registrar ator e resultado do lifecycle de equipamento em registro durável apropriado definido em I01, sem inventar uma issue para auditá-lo.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Testar parque vazio, com turbinas sem histórico, com issue aberta em uma turbina, equipamento somente referenciado em histórico e combinações de arquivo/restauração de pai/filha.
- [x] Exercitar ambos os resultados das corridas criação/edição versus exclusão/arquivo e criação/restauração de turbina versus arquivo de parque; verificar rollback integral, ausência de órfãos/deadlocks e novas issues negadas em localização inativa.
- [x] Testar retry após exclusão física usando recibo autorizado, revisão obsoleta, isolamento tenant e permissões; executar pnpm check e integrações issues/parks.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: contratos compartilhados em `packages/contracts/src/index.ts`; endpoints e transações de lifecycle em `apps/api/src/modules/parks/{routes,service}.ts`, composição em `apps/api/src/{app,server}.ts` e serviço público exportado em `parks/index.ts`. `DELETE` escolhe exclusão física sem referências ou arquivo com histórico; bloqueia issue aberta na localização atual. O parque considera a árvore e exclui filhos sem órfãos. `POST .../restore` restaura somente recursos arquivados. Recibos idempotentes persistem ator e resposta em `sync_commands`; códigos de arquivados seguem únicos. Sem migration.

Integrações PostgreSQL descartáveis: `pnpm test:issues-integration` passou, cobrindo bloqueio aberto, referências históricas, exclusão física, arquivo/restauração, retries após exclusão e restauração, autorização/tenant, revisão e corridas issue↔turbina e turbina↔parque. `pnpm test:parks-integration` passou (catálogo, autorização, unicidade, revisão e revogação). Verificações diretas passaram: Biome em 156 arquivos; `node scripts/check-boundaries.mjs`; TypeScript contracts/API/web; Vitest (3 arquivos, 19 testes); build API via TypeScript e web via Vite.

`pnpm check` foi iniciado e ficou sem saída; `timeout 40s pnpm check` terminou com 124. Seus componentes equivalentes foram executados diretamente e passaram conforme acima. Nenhuma alteração de schema/migration ou dado operacional dev. Arquivos de implementação: `apps/api/scripts/issues-read-flow.mjs`, `apps/api/scripts/parks-catalog-flow.mjs`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/modules/parks/{index,routes,service}.ts`, `packages/contracts/src/index.ts` e `packages/contracts/src/index.test.ts`.
