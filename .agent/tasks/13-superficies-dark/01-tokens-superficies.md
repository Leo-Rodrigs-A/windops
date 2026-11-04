# T01 — Tokens Tailwind para superfícies escuras

## Status e dependências

Em andamento; sem dependências de API ou banco.

- [ ] Task concluída.

## Objetivo e escopo

Substituir valores fixos dos tokens de superfície do modo escuro por cores Tailwind próximas à referência. Escopo: `background`, `surface`, `surface-raised`, `border`, `card`, `popover`, `muted`, `accent`, `input` e `sidebar`/borda da sidebar.

## Estado atual

Os tokens do tema ficam em `apps/web/src/styles.css`. Tema claro e tokens de primário, texto, foco, estados semânticos, botões e input não devem mudar.

## Plano

- [x] Usar variáveis da paleta `zinc` do Tailwind para fundo e níveis de superfície escura.
- [x] Preservar cores fora do escopo, especialmente texto, primário, estados semânticos, botão secundário e tema claro.
- [x] Executar `pnpm check` e revisar o diff para confirmar o escopo.

## Contratos e dados

Sem mudanças de API, schema ou persistência.

## Testes e aceite

- Só os tokens listados no escopo mudam no bloco `[data-theme="dark"]`.
- Paleta usa variáveis Tailwind e mantém contraste por meio dos tokens de texto existentes.
- `pnpm check` passa.

## Evidências

Concluída em 04/11/2026. `apps/web/src/styles.css` agora mapeia fundo/sidebar para zinc-950; superfície/card/popover para zinc-900; superfície elevada/muted/accent/bordas/input para zinc-800; borda da sidebar para zinc-900. Tokens de texto, primário, estados semânticos, `secondary` e tema claro não foram alterados. `pnpm check` passou: Biome/boundaries, typecheck, 17 arquivos/86 testes e builds. Inspeção do CSS compilado confirmou que `--color-zinc-800/900/950` está definido no bundle. `git diff --check` passou. A branch ativa é `feat/dark-surface-palette`; não houve commit nem push nesta execução.
