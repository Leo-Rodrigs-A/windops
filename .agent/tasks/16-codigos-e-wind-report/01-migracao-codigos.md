# C01 — Migration e contratos de códigos

**Status:** Concluída em 08/11/2026.  
**Task concluída:** [x]

## Objetivo

Adotar `P-<número>` para parques e `ZAC-<parque>-<turbina>` para turbinas, incluindo backfill transacional dos códigos atuais e aumento de colunas/checks/indexes necessários.

## Conversão dos dados atuais

- `P001` → `P-01`; o prefixo `P` antigo é seguido pelo número convertido para decimal com mínimo de dois dígitos.
- `T008` vinculado ao parque `P001` → `ZAC-01-08`; conservar IDs, `park_id`, workspace e datas originais.
- A migration deve abortar sem efeitos parciais se normalizar dois códigos para o mesmo destino no mesmo escopo.
- Códigos numéricos maiores que 99 preservam todos os dígitos; não truncar usando `lpad` com largura fixa.
- Renomeações incrementam `revision` e atualizam `updated_at` para que clientes com réplica antiga reconheçam a mudança.

## Escopo

- Atualizar Zod contracts e tipos; `parks.code` comporta até `P-999999`, e `turbines.code` até `ZAC-999999-999999`.
- Atualizar `apps/api/src/modules/parks/schema.ts` e criar migration Drizzle versionada com checks, tamanhos e índices necessários.
- Preservar IDs e relações de issues/eventos; não reescrever snapshots históricos.

## Validação e falhas

- [x] Instalação vazia executa a sequência completa de migrations.
- [x] Upgrade com dados nos códigos antigos converte parque e turbinas associadas sem alterar IDs.
- [x] Código inválido e colisão de conversão abortam a transação e preservam a versão antiga.
- [x] Constraints aceitam formatos novos e rejeitam formatos antigos/malformados.

## Evidências — 08/11/2026

`pnpm db:empty-check` passou em PostgreSQL descartável: instalação vazia, execução repetida, upgrade, persistência dos IDs, `P001` → `P-01`, `T008` → `ZAC-01-08`, colisões de parque/turbina abortadas sem alteração parcial e constraints/grants. Sem escrita em produção.
