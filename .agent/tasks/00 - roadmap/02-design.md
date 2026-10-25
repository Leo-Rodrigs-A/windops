# 02-design: Design system e estrutura visual

## Status

Implementação visual planejada; fluxo de referências externas documentado e acesso MCP validado.

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

Fluxo documental atualizado para referências externas não versionadas. A primeira consulta do MCP mostrou `C:\Users\leo-a\Downloads\WindOps.pen`; a leitura posterior mostrou o documento em `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`. Guia, componentes e home foram identificados estruturalmente; telas de autenticação não foram identificadas como frames explícitos. Isso não equivale a revisão visual completa. Implementação inicial detalhada em [F06](../01-fundacao/06-design-system.md) e [F07](../01-fundacao/07-interfaces-iniciais.md), com validação em F08. Nenhum token, componente ou tela foi implementado nesta atualização; testes visuais e de acessibilidade permanecem pendentes. `pnpm check` não executado por se tratar apenas de documentação.
