# BR01 — Ícone Brisa

**Status:** Concluída em 08/11/2026.  
**Task concluída:** [x]

## Objetivo

Substituir a turbina outlined pelo ícone Brisa filled enviado em `/mnt/c/Users/leo-a/Downloads/brisa.svg`, adaptando cores e posicionamento para as superfícies do Wind Ops.

## Escopo e exclusões

- Atualizar o componente `TowerMark` usado na landing, acesso, home e navegação do workspace.
- Atualizar favicons claro/escuro, SVG PWA, PNGs 192/512 e Apple touch icon.
- Preservar o fundo claro/escuro do ícone instalável e usar azul primário no símbolo claro, com símbolo claro no tema escuro.
- Não alterar o documento de design Pencil, o nome do produto, tipografia ou layouts.

## Dependências

- SVG Brisa fornecido pelo proprietário; nenhuma dependência de runtime adicionada.

## Implementação

- [x] Trocar o caminho da turbina no componente de marca e centralizar a forma no viewBox quadrado.
- [x] Atualizar os SVGs de favicon e PWA para usar o símbolo filled e paleta do sistema.
- [x] Regenerar os PNGs Apple/PWA em seus tamanhos existentes.
- [x] Conferir visualmente o PNG PWA de 512 px e revisar todos os pontos de uso.
- [x] Executar `pnpm check` e registrar evidências.

## Contratos e dados

Sem alteração de API, schema, dados ou contratos. Os nomes dos arquivos públicos referenciados pelo HTML e manifesto foram preservados.

## Aceite e evidências

Em 08/11/2026, o componente `TowerMark` e todos os assets públicos existentes passaram a exibir a turbina Brisa filled. O símbolo usa `text-brand` dentro do site; o favicon usa `#1d4ed8` no tema claro e `#93c5fd` no escuro; os SVGs/PNGs de PWA usam a mesma paleta nos respectivos temas. A composição fica centralizada com margem de segurança no quadrado instalável. `pnpm check` passou: lint e boundaries, typechecks, 86 testes em 17 arquivos e build de produção. O PNG de 512 px foi inspecionado visualmente. Sem validação manual em aparelho nesta task.
