# 05-parks: Parques e turbinas

## Status

Em andamento — slices 03 e parte da 04 implementadas; I08 revalidou lifecycle integrado a issues. Slice 16 atualiza códigos e ordenação do catálogo online/offline; catálogo local durável permanece futuro.

Execução detalhada nas slices [03 — Parques e turbinas](../03-parques-turbinas/README.md) e [04 — Registro e atendimento](../04-registro-atendimento/README.md). P01–P06 e o lifecycle integrado I06 foram implementados; I08 revalidou as corridas com issues em PostgreSQL descartável em 26/10/2026. A slice 04 recebeu aceite funcional; a etapa permanece parcial pelo catálogo local durável da etapa 07, planejado na [slice 05](../05-offline-sincronizacao/README.md). Escritas administrativas continuam online nesse recorte.

## Objetivo e escopo

Cadastros de parques `P-01` e turbinas `ZAC-01-04` vinculadas ao parque, administrados por admin. Catálogos locais preparados.

## Dependências

04

## Critérios de aceite

Número configurável; código de turbina único no parque; excluir definitivamente somente sem referências atuais/históricas; arquivar com histórico fechado, bloqueando arquivo enquanto houver issue aberta no equipamento ou em qualquer turbina do parque; preservar histórico e permitir restauração sem reativar turbinas antes arquivadas individualmente; não criar entidade elevador desnecessária.

## Testes

Permissões, unicidade, relações entre tenants, exclusão/arquivamento conforme histórico e corrida com criação de issue, catálogo sem itens.

Lifecycle integrado a issues foi implementado na [slice 04](../04-registro-atendimento/README.md), especialmente I06, e revalidado na I08; I01 registrou as regras em 26/10/2026. Catálogo offline permanece na etapa 07.

Atualização de nomenclatura/ordem — 08/11/2026: a [slice 16](../16-codigos-e-wind-report/README.md) migra códigos legados para `P-<parque>` e `ZAC-<parque>-<turbina>`, gera novos códigos nesse padrão e ordena catálogo pela criação em API, réplica e fallback. `pnpm check`, upgrade/migration e integração de catálogo passaram em ambiente descartável; sem alteração direta ou deploy em produção. Ensaio manual offline/reconexão não realizado.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
