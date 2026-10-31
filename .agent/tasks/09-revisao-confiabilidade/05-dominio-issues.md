# R05 — Domínio e orquestração de Issues

## Status

Planejada; depende de R04.

- [ ] Task concluída

## Objetivo

Separar decisões de domínio da orquestração SQL em issues onde isso torne regras e falhas mais claras.

## Escopo e exclusões

Foco em `transitionIssue`, validação de estado/ator/hora, hashes e recibos. Repositories permanecem internos ao módulo e podem receber PoolClient. Sem máquina de estados genérica ou mudança de payload/regra.

## Estado atual

Baseline A07/A08 identifica mistura de estado, papel, autoria, hora, locks, hash, SQL e DTO. Parks possui hash distinto; sync centraliza recibos. R04 confirmou que o serviço de issues usa apenas a interface transacional de autorização para escritas; a facade continua na composição e nas rotas centrais.

## Dependências

R04 concluída; regressão PostgreSQL issues e parks aprovada em R03.

## Plano

- [ ] Catalogar transições e respostas atuais por estado, ator, cargo, autoria, arquivo e elegibilidade de uma hora.
- [ ] Registrar vetores de hash/replay para comandos atuais antes de mover serialização.
- [ ] Extrair políticas puras para decisões demonstradas; manter timestamps e autoridade final do PostgreSQL onde requeridos.
- [ ] Separar orquestração de persistência somente quando a transação e a sequência de locks permanecerem explícitas.
- [ ] Avaliar compartilhamento de hash com Parks; compartilhar apenas se equivalência de serialização for provada por vetores anteriores.
- [ ] Adicionar regressões de policy, idempotência, conflito de revisão, auditoria/notificação atômicas, race de equipamento e revogação.
- [ ] Executar `pnpm check`, integração issues e parks; comparar DTOs/recibos pré e pós-refactor.
- [ ] Detalhar R06 mapeando telas, hooks e estado compartilhado afetado.

## Contratos e dados afetados

Organização interna de domínio/SQL. Sem mudança de endpoint, regra, ID, hash persistido ou schema.

## Testes e aceite

Matriz de transições e hashes permanece equivalente; rollback e locks passam na integração PostgreSQL; nenhuma regra é provada só por mocks.

## Evidências

Plano criado para A07/A08 e lacuna A12; implementação não iniciada.

## Refinamento pela R04

Priorizar `transitionIssue` e `lifecycleIssue`, depois avaliar `createIssue`/`editIssue`. Cada fluxo atual passa por `withWriteTransaction`, revalida membership dentro da transação, e combina lock de localização em Parks, `FOR UPDATE` da issue, `replayReceipt`, evento de audit e recibo Sync. A regra de uma hora usa `clock_timestamp()` do PostgreSQL e permanece autoritativa no banco. Mapear decisões puras sem tirar locks, hash e recibos da transação nem duplicar políticas. Não mudar a facade ou a interface de autorização transacional já segregada em R04.
