# R05 — Domínio e orquestração de Issues

## Status

- Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Separar decisões de domínio da orquestração SQL em issues onde isso torne regras e falhas mais claras.

## Escopo e exclusões

Foco em `transitionIssue`, validação de estado/ator/hora, hashes e recibos. Repositories permanecem internos ao módulo e podem receber PoolClient. Sem máquina de estados genérica ou mudança de payload/regra.

## Estado atual

Baseline A07/A08 identifica mistura de estado, papel, autoria, hora, locks, hash, SQL e DTO. Parks possui hash distinto; sync centraliza recibos. R04 confirmou que o serviço de issues usa apenas a interface transacional de autorização para escritas; a facade continua na composição e nas rotas centrais.

## Dependências

R04 concluída; regressão PostgreSQL issues e parks aprovada em R03.

## Plano

- [x] Catalogar transições e respostas atuais por estado, ator, cargo, autoria, arquivo e elegibilidade de uma hora.
- [x] Registrar vetores de hash/replay para comandos atuais antes de mover serialização.
- [x] Extrair políticas puras para decisões demonstradas; manter timestamps e autoridade final do PostgreSQL onde requeridos.
- [x] Avaliar separação entre orquestração e persistência; manter os fluxos juntos no serviço porque locks, autorização, recibos e audit precisam continuar visivelmente na mesma transação.
- [x] Avaliar compartilhamento de hash com Parks e unificar após provar serialização equivalente com vetores anteriores.
- [x] Adicionar regressões de policy, idempotência, conflito de revisão, auditoria/notificação atômicas, race de equipamento e revogação.
- [x] Executar `pnpm check`, integração issues e parks; comparar DTOs/recibos pré e pós-refactor.
- [x] Detalhar R06 mapeando telas, hooks e estado compartilhado afetado.

## Contratos e dados afetados

Organização interna de domínio/SQL. Sem mudança de endpoint, regra, ID, hash persistido ou schema.

## Testes e aceite

Matriz de transições e hashes permanece equivalente; rollback e locks passam na integração PostgreSQL; nenhuma regra é provada só por mocks.

## Evidências

R05 extraiu decisões de transição e lifecycle para `issues/domain.ts`. A camada SQL continua responsável por autorização dentro da transação, replay de recibo, leitura/locks de localização e issue, atualização, audit, recibo Sync e notificação; não foi criado repository genérico nem movido o `clock_timestamp()` autoritativo. A ordem e o comportamento dos retornos foram cobertos por matriz pura de policies. A verificação antecipada de arquivo foi mantida na orquestração porque precede conflito de revisão na resposta atual. A permissão `release` de admin permanece aplicada pela autorização transacional.

Issues e Parks agora usam `platform/idempotency/command-hash.ts`. Os dois algoritmos anteriores eram SHA-256 de JSON recursivamente ordenado; vetores dourados preservam bytes/hex de comandos de Issue e lifecycle de Park, inclusive equivalência sob ordem diferente das chaves. Os recibos e DTOs persistidos não mudaram.

Validação: `pnpm check` passou com 76 testes, typechecks, lint/boundaries e builds. `pnpm test:issues-integration` e `pnpm test:parks-integration` passaram em bancos descartáveis: replay e divergência idempotente, conflitos de revisão, auditoria/recibos/notificações atômicos, elegibilidade de uma hora calculada pelo PostgreSQL, isolamento tenant, revogação e races de equipamento. Integração confirmou os DTOs/replays existentes após a extração. Nenhum contrato HTTP, schema, regra ou payload persistido mudou.

## Refinamento pela R04

Priorizar `transitionIssue` e `lifecycleIssue`, depois avaliar `createIssue`/`editIssue`. Cada fluxo atual passa por `withWriteTransaction`, revalida membership dentro da transação, e combina lock de localização em Parks, `FOR UPDATE` da issue, `replayReceipt`, evento de audit e recibo Sync. A regra de uma hora usa `clock_timestamp()` do PostgreSQL e permanece autoritativa no banco. Mapear decisões puras sem tirar locks, hash e recibos da transação nem duplicar políticas. Não mudar a facade ou a interface de autorização transacional já segregada em R04.
