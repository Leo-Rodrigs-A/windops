# R06 — Frontend por feature

## Status

Planejada; depende de R05.

- [ ] Task concluída

## Objetivo

Reduzir concentração de páginas extraindo comportamento de issues, equipe e parques por fluxos coesos.

## Escopo e exclusões

Começar por issues e seguir para equipe/parques conforme dependências; manter componentes Shadcn compartilhados. Sem redesenho, alteração de API ou mudança funcional deliberada.

## Estado atual

Baseline A10/A12 identificou `issues-pages.tsx`, `workspace-pages.tsx` e `parks-page.tsx` concentrando consultas, ações e componentes. Q05 e R01 registram aceite funcional Chrome/Edge, mas não substituem regressão dos módulos movidos.

## Dependências

R05 concluída; Q05 concluída. Usar comportamento existente como baseline.

## Plano

- [ ] Mapear cada rota/componente, estado, query/cache, mutation, permissão e navegação de teclado antes da extração.
- [ ] Extrair por fluxo pequeno: consultas, ações/hooks e componentes de apresentação, preservando loaders/guards e fronteiras API.
- [ ] Migrar issues primeiro; depois equipe e parques com diffs independentes e builds intermediários.
- [ ] Preservar geração contra respostas tardias, cursor/filtros, offline/parcial, foco, tema, responsividade e acessibilidade existentes.
- [ ] Ampliar testes de unidade/harness somente onde comportamento mudou de fronteira; evitar teste que espelha implementação.
- [ ] Executar `pnpm check` e validar browser Chrome/Edge, cargos e estados; registrar o que foi automatizado e o que foi aceito manualmente.
- [ ] Atualizar mapa de módulos e detalhar R07 com dependências de LocalIssueStore.

## Contratos e dados afetados

Estrutura interna de React/TypeScript. Sem alteração de API, persistência ou layout visual.

## Testes e aceite

Rotas e ações iguais antes/depois; estados de loading/erro/parcial/offline preservados; teclado/foco e consultas não regridem em Chrome/Edge.

## Evidências

Plano criado para A10/A12; implementação não iniciada.
