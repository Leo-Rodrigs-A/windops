# R03 — Transações e erros PostgreSQL

## Status

Planejada; depende de R02.

- [ ] Task concluída

## Objetivo

Reduzir duplicação transacional e impedir que erros PostgreSQL inesperados sejam apresentados como conflitos de negócio.

## Escopo e exclusões

Começar por issues e parks; inventariar os demais blocos `BEGIN` e migrar somente se a mesma semântica puder ser preservada. Sem mudanças em contratos, locks, isolamento, schema ou retries externos.

## Estado atual

Baseline R01 encontrou 15 blocos `BEGIN`, helpers sobrepostos em issues/parks e conversões amplas de SQLSTATE 23505/23503.

## Dependências

R02 concluída e registrada no índice.

## Plano

- [ ] Mapear BEGIN/COMMIT/ROLLBACK, resultado de domínio e ordem de locks em cada caminho candidato.
- [ ] Definir executor pequeno sobre PoolClient que sempre libera conexão, preserva erro da operação e agrega/relata falha de rollback sem mascarar a causa.
- [ ] Migrar primeiro issues e parks, preservando authorization, locks de workspace/equipamento, rollback de audit/sync e resultado de negócio.
- [ ] Classificar erros por SQLSTATE e constraint; mapear apenas constraints conhecidas e manter erros inesperados como internos.
- [ ] Unificar respostas HTTP somente para helpers com status, código, mensagem e schema idênticos.
- [ ] Testar BEGIN/operação/COMMIT/ROLLBACK falhos, liberação de conexão, erro original, constraints esperadas e erro inesperado.
- [ ] Executar `pnpm check`, integrações de issues e parks; verificar transações remanescentes e documentar as não migradas.
- [ ] Registrar evidência e detalhar R04 conforme interfaces públicas observadas.

## Contratos e dados afetados

Helpers privados de transação/classificação e mapeamento HTTP. Sem mudança de contrato público ou schema.

## Testes e aceite

Autorização e revalidação permanecem dentro da transação; nenhuma escrita parcial em erro; erro inesperado não vaza SQL nem vira conflito; concorrência/rollback existentes passam em PostgreSQL.

## Evidências

Plano criado a partir de A04, A05 e A09 em `baseline-r01.md`; implementação não iniciada.
