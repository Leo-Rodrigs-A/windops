# 05-parks: Parques e turbinas

## Status

Planejada

Execução inicial detalhada na [slice 03 — Parques e turbinas](../03-parques-turbinas/README.md), com P01–P06 ainda pendentes. Esse recorte entrega cadastro, consulta e edição online. Desativação permanece pendente até a integração transacional com issues, sem endpoint permissivo provisório; catálogo local durável depende da etapa 07. Concluir a slice 03 não conclui toda esta etapa do roadmap.

## Objetivo e escopo

Cadastros de códigos P/T e vínculo obrigatório da turbina ao parque, administrados por admin. Catálogos locais preparados.

## Dependências

04

## Critérios de aceite

Número configurável; código de turbina único no parque; desativação bloqueada com issues abertas; não criar entidade elevador desnecessária.

## Testes

Permissões, unicidade, relações entre tenants, bloqueio de desativação, catálogo sem itens.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.
