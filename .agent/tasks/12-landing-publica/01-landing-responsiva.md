# L01 — Landing longa responsiva

## Status e dependências

Concluída em 04/11/2026; sem dependências de backend. Implementada sobre a rota pública existente `/`.

- [x] Task concluída.

## Objetivo e escopo

Expandir a landing atual para acompanhar a composição da referência enviada: hero, explicação do fluxo, benefícios de captura e contexto compartilhado, organização do workspace, estados dos chamados, busca/histórico, FAQ e chamada final. Manter links reais de cadastro e entrada, comportamento de conta órfã e tema atual.

## Estado atual

A landing está em `apps/web/src/pages/access-pages.tsx`, com cabeçalho, hero e cartão de preview abstrato. Não há as seções explicativas longas mostradas na nova referência.

## Plano

- [x] Separar a composição pública em componente legível sem alterar rotas ou autenticação.
- [x] Adicionar seções responsivas com hierarquia, separadores e superfícies no tema escuro.
- [x] Criar mockups sem interação com dados claramente ilustrativos; usar somente capacidades já implementadas nos textos.
- [x] Preservar CTA de cadastro/entrada e estado da conta sem workspace.
- [x] Executar `pnpm check` e registrar resultado e limitações.

## Contratos e dados

Sem mudanças de contrato, banco ou autorização. Conteúdo estático em pt-BR.

## Testes e aceite

- Landing sem overflow horizontal em viewport estreito e com leitura ordenada em desktop.
- Links levam às rotas reais; conta órfã mantém a ação de status.
- Conteúdo acessível por teclado e leitores de tela; exemplos visuais identificados como demonstração.
- `pnpm check` passa.

## Evidências

04/11/2026: landing extraída para `apps/web/src/pages/public-landing-page.tsx` e ampliada com fluxo, registro offline, avisos, organização de workspace, estados de chamados, busca/histórico, FAQ e CTA final. Cadastro, entrada e conta órfã preservam os destinos reais. Elementos demonstrativos não são controles ativos e estão identificados como ilustração. `pnpm check` passou: Biome/boundaries, typecheck, 17 arquivos de teste (86 testes) e builds dos contratos, API e web. Revisão visual com navegador integrado não realizada: MCP Pencil informou que o app desktop está desconectado; o servidor Vite também não pôde ser usado por conflito/limitação de porta. Não houve alteração de API, dados ou arquivos `.pen`.
