# R04 — Interfaces de Workspaces

## Status

Planejada; depende de R03.

- [ ] Task concluída

## Objetivo

Separar capacidades de autorização, gestão de membros e convites sem duplicar regras ou enfraquecer autorização tenant.

## Escopo e exclusões

Refatorar contratos internos do módulo e dependências mínimas de issues, parks e routes. Preservar exports públicos durante a migração. Sem mudança de regras de cargo, convites, e-mail ou API.

## Estado atual

Baseline A06 encontrou serviço de autorização com 12 métodos que mistura contexto, diretório, membros e convites. A13 identificou limite no verificador de fronteiras de imports.

## Dependências

R03 concluída; referência de regressão: `test:workspaces-integration` e `test:auth-integration`.

## Plano

- [ ] Inventariar cada consumidor e os métodos realmente usados, incluindo rotas e integração.
- [ ] Definir interfaces pequenas por capacidade e manter facade/export público compatível.
- [ ] Migrar consumidores para o menor contrato sem imports internos entre módulos.
- [ ] Testar segundo fator, tenant cruzado, revogação concorrente, último admin, convite/aceite/reenvio e pós-commit de e-mail.
- [ ] Fortalecer `check-boundaries.mjs` contra padrões de import encontrados na auditoria, com casos positivos/negativos, sem aliases internos.
- [ ] Executar `pnpm check`, integrações auth/workspaces e issues/parks se consumidor alterado.
- [ ] Verificar diffs de contratos e detalhar R05 a partir dos caminhos de Issues.

## Contratos e dados afetados

Interfaces TypeScript internas/exportadas. Nenhuma alteração de HTTP, schema ou política de autorização.

## Testes e aceite

Consumidores dependem apenas de capacidades usadas; revogação/membership continua revalidada dentro da transação; isolamento e convite seguem idênticos.

## Evidências

Plano criado para A06/A13 da baseline; implementação não iniciada.
