# 02-design: Design system e estrutura visual

## Status

Implementação inicial concluída em F06/F07 e revisada em desktop e emulação mobile; o teste físico Android permanece pendente na F08.

## Objetivo e escopo

Consultar layouts mobile/design system pelo MCP do Pencil/pen.dev no Windows, confirmando o documento indicado pelo proprietário. Usar os arquivos somente como guia, sem alterá-los, copiá-los para o repositório ou commitá-los. Implementar tokens, componentes e navegação comuns, estados vazios, carregamento e erros; adaptar desktop sem inventar fluxos.

## Dependências

01 e acesso às referências `.pen` mantidas pelo proprietário em uma pasta local do Windows fora do repositório. Não depender desses arquivos para executar, compilar ou validar o código em CI.

## Critérios de aceite

Telas seguem referência, navegação por teclado, contraste e alvos táteis; não expor controles de funções indisponíveis.

## Testes

Comparação visual, larguras mobile/desktop, foco e leitor de tela.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

## Evidência e pendências — 24/10/2026

Fluxo documental atualizado para referências externas não versionadas. O documento consultado pelo MCP foi `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`; guia, componentes e home foram identificados estruturalmente, sem frames explícitos de autenticação. Implementação em [F06](../01-fundacao/06-design-system.md) e [F07](../01-fundacao/07-interfaces-iniciais.md). Em F08, comparação desktop e emulação mobile, teclado, Narrador do Windows e fluxo físico Android foram validados; iPhone não foi disponibilizado. As referências `.pen` continuam fora do repositório.
