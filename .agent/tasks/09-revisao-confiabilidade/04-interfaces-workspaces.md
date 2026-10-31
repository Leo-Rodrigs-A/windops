# R04 — Interfaces de Workspaces

## Status

- Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Separar capacidades de autorização, gestão de membros e convites sem duplicar regras ou enfraquecer autorização tenant.

## Escopo e exclusões

Refatorar contratos internos do módulo e dependências mínimas de issues, parks e routes. Preservar exports públicos durante a migração. Sem mudança de regras de cargo, convites, e-mail ou API.

## Estado atual

Baseline A06 encontrou serviço de autorização com 12 métodos que mistura contexto, diretório, membros e convites. A13 identificou limite no verificador de fronteiras de imports. R03 migrou issues/parks para `withPostgresTransaction`; workspaces mantém cinco transações próprias por conter fluxos distintos de membership, convite e revogação. O executor novo recebe `PoolClient`, permitindo reuso sem mover a autorização transacional para fora do módulo.

## Dependências

R03 concluída; referência de regressão: `test:workspaces-integration` e `test:auth-integration`. Não migrar as transações de workspaces sem demonstrar equivalência de locks e regras do último admin.

## Plano

- [x] Inventariar cada consumidor e os métodos realmente usados, incluindo rotas e integração.
- [x] Definir interfaces pequenas por capacidade e manter facade/export público compatível.
- [x] Migrar consumidores para o menor contrato sem imports internos entre módulos.
- [x] Testar segundo fator, tenant cruzado, revogação concorrente, último admin, convite/aceite/reenvio e pós-commit de e-mail.
- [x] Fortalecer `check-boundaries.mjs` contra imports estáticos, exports, `import()`, `import type`, `require()` e aliases TS, com casos positivos/negativos.
- [x] Executar `pnpm check`, integrações auth/workspaces/issues/parks.
- [x] Verificar diffs de contratos e detalhar R05 a partir dos caminhos de Issues.

## Contratos e dados afetados

Interfaces TypeScript internas/exportadas. Nenhuma alteração de HTTP, schema ou política de autorização.

## Testes e aceite

Consumidores dependem apenas de capacidades usadas; revogação/membership continua revalidada dentro da transação; isolamento e convite seguem idênticos.

## Evidências

R04 concluiu a segregação dos contratos sem mover as regras para serviços paralelos: `WorkspaceIdentityService`, autorização por request/transação, contexto, gestão de membros e convites; `WorkspaceAuthorizationService` continua facade compatível. Issues/parks dependem do contrato transacional nas escritas e da autorização request nas rotas; notifications declara os dois métodos necessários em suas rotas e só o transacional no serviço; sync usa somente autorização request; o registrador de workspaces e a composição mantêm a facade completa.

O verificador agora usa o scanner suportado pela versão atual de TypeScript, resolve extensões `.js` para fontes TypeScript e mapeamentos `paths` da cadeia local de `tsconfig`. A suíte inclui imports/export estáticos, dinâmicos, `import type`, `require`, templates sem interpolação, aliases profundos rejeitados e barrel público permitido. Sem aliases internos novos.

Validação: `pnpm check` passou (71 testes e builds); `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:issues-integration` e `pnpm test:parks-integration` passaram em PostgreSQL/Mailpit descartáveis. Integrações preservaram segundo fator, tenant, último admin, convite/reenvio, locks, concorrência e atomicidade. Nenhum diff em contrato HTTP, schema ou políticas de autorização.
