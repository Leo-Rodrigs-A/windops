# 05-parks: Parques e turbinas

## Status

Em andamento — a slice executável 03 foi concluída em 26/10/2026; lifecycle com issues e catálogo offline permanecem pendentes.

Execução detalhada na [slice 03 — Parques e turbinas](../03-parques-turbinas/README.md). P01–P06 concluídas em 26/10/2026. A etapa permanece parcialmente atendida: exclusão definitiva sem issues e arquivamento/restauração com histórico dependem da integração transacional com issues; catálogo local durável depende da etapa 07.

## Objetivo e escopo

Cadastros de códigos P/T e vínculo obrigatório da turbina ao parque, administrados por admin. Catálogos locais preparados.

## Dependências

04

## Critérios de aceite

Número configurável; código de turbina único no parque; excluir definitivamente somente sem referências atuais/históricas; arquivar com histórico fechado, bloqueando arquivo enquanto houver issue aberta no equipamento ou em qualquer turbina do parque; preservar histórico e permitir restauração sem reativar turbinas antes arquivadas individualmente; não criar entidade elevador desnecessária.

## Testes

Permissões, unicidade, relações entre tenants, exclusão/arquivamento conforme histórico e corrida com criação de issue, catálogo sem itens.

Lifecycle integrado a issues está planejado na [slice 04](../04-registro-atendimento/README.md), especialmente I06; I01 registrou as regras em 26/10/2026. A implementação e o catálogo offline continuam pendentes; catálogo offline permanece na etapa 07.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
