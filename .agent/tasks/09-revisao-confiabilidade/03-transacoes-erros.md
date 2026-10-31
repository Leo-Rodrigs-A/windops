# R03 — Transações e erros PostgreSQL

## Status

Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Reduzir duplicação transacional e impedir que erros PostgreSQL inesperados sejam apresentados como conflitos de negócio.

## Escopo e exclusões

Começar por issues e parks; inventariar os demais blocos `BEGIN` e migrar somente se a mesma semântica puder ser preservada. Sem mudanças em contratos, locks, isolamento, schema ou retries externos.

## Estado atual

Baseline R01 encontrou 15 blocos `BEGIN`, helpers sobrepostos em issues/parks e conversões amplas de SQLSTATE 23505/23503.

## Dependências

R02 concluída e registrada no índice.

## Plano

- [x] Mapear BEGIN/COMMIT/ROLLBACK, resultado de domínio e ordem de locks em cada caminho candidato.
- [x] Definir executor pequeno sobre PoolClient que sempre libera conexão, preserva erro da operação e agrega/relata falha de rollback sem mascarar a causa.
- [x] Migrar issues e parks, preservando authorization, locks de workspace/equipamento, rollback de audit/sync e resultado de negócio.
- [x] Classificar erros por SQLSTATE e constraint em issues, parks e convites; mapear apenas constraints conhecidas e manter erros inesperados como internos.
- [x] Unificar respostas HTTP somente para helpers com status, código, mensagem e schema idênticos.
- [x] Testar BEGIN/operação/COMMIT/ROLLBACK falhos, liberação de conexão, erro original, constraints esperadas e erro inesperado.
- [x] Executar `pnpm check`, integrações de issues, parks e workspaces; verificar transações remanescentes e documentar as não migradas.
- [x] Registrar evidência e detalhar R04 conforme interfaces públicas observadas.

## Contratos e dados afetados

Helpers privados de transação/classificação e mapeamento HTTP. Sem mudança de contrato público ou schema.

## Testes e aceite

Autorização e revalidação permanecem dentro da transação; nenhuma escrita parcial em erro; erro inesperado não vaza SQL nem vira conflito; concorrência/rollback existentes passam em PostgreSQL.

## Evidências

30/10/2026 — Criado `platform/database/transaction.ts`: libera o client em todos os caminhos, faz rollback de resultados de domínio e exceções, preserva o erro original e agrega erro de rollback (descartando a conexão inválida). Issues e parks passaram a usar o executor mantendo autorização dentro da transação e locks de equipamento/workspace na ordem existente. Erros `23505` só viram conflito para `issues_pkey`, `issues_id_workspace_unique`, `parks_workspace_code_unique`, `turbines_park_code_unique` e `workspace_invitations_active_email_unique`; colisão do recibo de comando vira `idempotency_conflict`; constraint desconhecida e todo `23503` seguem como erro interno. Os helpers de access error idênticos de issues/parks foram centralizados sem alterar os payloads.

Cobertura: `transaction.test.ts` injeta falhas em BEGIN/operação/COMMIT/ROLLBACK, confere liberação, preservação/aggregate do erro e comparação exata de SQLSTATE/constraint. `pnpm check` passou (68 testes e builds); `pnpm test:issues-integration`, `pnpm test:parks-integration` e `pnpm test:workspaces-integration` passaram em PostgreSQL descartável, incluindo atomicidade, concorrência, unicidade e lifecycle. `git diff --check` passou.

Recontagem corrigida da baseline: havia 17 ocorrências de BEGIN antes da migração (duas wrappers de issues/parks e 15 nos outros módulos). Permanecem 15 fronteiras em workspaces (5), identity/provider (2), identity/challenges (3) e notifications (5); foram mantidas porque seus fluxos de membership, OTP, rate limit e leasing/outbox têm semânticas distintas fora do escopo desta task. R04 pode depender do executor compartilhado, mas não precisa mover essas transações.
