# R06 — Frontend por feature

## Status

- Concluída em 30/10/2026; aceite manual Chrome/Edge confirmado pelo proprietário.

- [x] Task concluída

## Objetivo

Reduzir concentração de páginas extraindo comportamento de issues, equipe e parques por fluxos coesos.

## Escopo e exclusões

Começar por issues e seguir para equipe/parques conforme dependências; manter componentes Shadcn compartilhados. Sem redesenho, alteração de API ou mudança funcional deliberada.

## Estado atual

Baseline A10/A12 identificou `issues-pages.tsx`, `workspace-pages.tsx` e `parks-page.tsx` concentrando consultas, ações e componentes. Q05 e R01 registram aceite funcional Chrome/Edge, mas não substituem regressão dos módulos movidos.

Mapa confirmado para execução: `main.tsx` liga `/app`, `/chamados/$issueId`, `/historico` e `/arquivados` ao fluxo de issues, e `/equipe`/aceite de convite às páginas de workspace; `/parques` usa `ParksCatalogPage`. `issues-pages.tsx` reúne home, listas arquivadas, detalhe, histórico e conta; `workspace-pages.tsx` reúne home, gestão de equipe e convite; `parks-page.tsx` contém catálogo. Estado/capacidades transversais estão em `auth/auth-context.tsx`, `offline/offline-workspace-context.tsx`, cliente API em `lib`/`api` e componentes compartilhados `components/ui`. Antes de mover, mapear por página query keys/cache, mutations e guards; preservar cursores/filtros e estados offline/parciais. Não extrair AccountSettingsPage para equipe sem confirmar seus vínculos reais.

## Dependências

R05 concluída; Q05 concluída. Usar comportamento existente como baseline.

## Plano

- [x] Mapear cada rota/componente, estado, query/cache, mutation, permissão e navegação de teclado antes da extração.
- [x] Extrair por fluxo pequeno: consultas, ações/hooks e componentes de apresentação, preservando loaders/guards e fronteiras API.
- [x] Migrar issues primeiro; depois equipe e parques com diffs independentes e builds intermediários.
- [x] Preservar geração contra respostas tardias, cursor/filtros, offline/parcial, foco, tema, responsividade e acessibilidade existentes.
- [x] Ampliar testes de unidade/harness somente onde comportamento mudou de fronteira; evitar teste que espelha implementação.
- [x] Executar `pnpm check` e validar browser Chrome/Edge, cargos e estados; registrar o que foi automatizado e o que foi aceito manualmente.
- [x] Atualizar mapa de módulos e detalhar R07 com dependências de LocalIssueStore.

## Contratos e dados afetados

Estrutura interna de React/TypeScript. Sem alteração de API, persistência ou layout visual.

## Testes e aceite

Rotas e ações iguais antes/depois; estados de loading/erro/parcial/offline preservados; teclado/foco e consultas não regridem em Chrome/Edge.

## Evidências

30/10/2026 — Refatoração por feature entregue. `issues-pages.tsx` agora é facade de compatibilidade; `main.tsx` carrega chunks por lista, detalhe, histórico, conta, equipe e parques. `features/issues` reúne `issue-list-pages`, detalhe, histórico, conta, `components` e `model`; projeções offline e snapshots ficam no model, componentes de filtros/lista/eventos ficam isolados. `TeamManagementPage` migrou para `features/workspaces`; catálogo de parques migrou para `features/parks` e o hook `useParksCatalog` concentra carregamento paginado, cache/fallback offline, debounce e invalidação por geração.

O estado compartilhado permanece no `AuthProvider` e `OfflineWorkspaceProvider`; mutations continuam nos clients `lib/issues-api.ts`/`lib/workspace-api.ts`. Filtros/cursors continuam locais à página e a store/journal continua a fonte dos comandos pendentes. Nenhuma API, permissão, layout, tecla, theme token ou persistência foi alterada. Testes de view model cobrem projeção de edição pendente, resolução de labels do catálogo, sequência de códigos e mensagens de erro. `pnpm check` passou com 81 testes, lint/boundaries, typechecks e builds; o build produz chunks lazy separados por rota.

Aceite manual pós-refactor: o proprietário confirmou que validou os fluxos e que tudo está funcionando. Registro como validação do proprietário; não como observação direta do agente. Sem mudança em layout ou comportamento intencional.
