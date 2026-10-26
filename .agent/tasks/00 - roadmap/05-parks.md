# 05-parks: Parques e turbinas

## Status

Planejada

Execução detalhada na [slice 03 — Parques e turbinas](../03-parques-turbinas/README.md). P01–P05 concluídas; falta P06. Exclusão definitiva quando não há issues e arquivamento/restauração quando há histórico foram solicitados pelo proprietário e dependem da integração transacional com o domínio issues. Catálogo local durável depende da etapa 07. Concluir a slice 03 não conclui toda esta etapa do roadmap.

## Objetivo e escopo

Cadastros de códigos P/T e vínculo obrigatório da turbina ao parque, administrados por admin. Catálogos locais preparados.

## Dependências

04

## Critérios de aceite

Número configurável; código de turbina único no parque; excluir definitivamente somente sem issues; preservar e arquivar equipamento com qualquer histórico de issue, com possibilidade de restauração; não criar entidade elevador desnecessária.

## Testes

Permissões, unicidade, relações entre tenants, exclusão/arquivamento conforme histórico e corrida com criação de issue, catálogo sem itens.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
