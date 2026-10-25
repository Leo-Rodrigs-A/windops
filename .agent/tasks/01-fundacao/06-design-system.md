# F06 — Referências e componentes visuais

## Status e dependências

Concluída em 25/10/2026. Referências foram reconfirmadas e as três imagens selecionadas para home foram inspecionadas. O proprietário autorizou compor as telas sem frame com os padrões existentes, pediu sidebar desktop e uso obrigatório de Shadcn; Tailwind blue-600 resolve o contraste do primário.

- [x] Task concluída.

## Objetivo e escopo

Extrair uma especificação visual verificável e implementar os tokens/componentes necessários às interfaces da fundação, reaproveitando React/Tailwind/ShadcnUI existentes. Não redesenhar o `.pen`, gerar site externo ou copiar o documento para o Git.

## Referência conhecida

Ver documento e IDs no [índice da slice](README.md). Há guia de estilo claro/escuro, tipografia Inter, componentes e home escura com variações. Na leitura inicial, não há variáveis cadastradas nem componentes reutilizáveis formais. A ausência de telas de auth é uma lacuna a confirmar, não autorização para inventar layouts definitivos.

## Plano de implementação

- [x] Reconsultar `get_app_state` no MCP do Windows e confirmar `WindOps.pen`. Ler árvore, propriedades e screenshots relevantes por MCP, sem escrever no design.
- [x] Criar `.agent/design-reference.md` com data, documento, IDs, inventário, medidas e valores extraídos dos fills reais; registrar ausência de variáveis e nomes inconsistentes de swatches.
- [x] Conferir `GhvhB`, `F4nqNr` e `QhQxw`/`FGvyG`, incluindo botões, campos, superfícies, bordas, texto, raios, ícones e tipografia. Distinguir chrome do aparelho da interface web: barra de status, câmera e teclado são elementos do dispositivo e não serão reproduzidos como UI web.
- [x] Mapear propriedades observadas em tokens CSS semânticos claro/escuro. `GetVariables()` vazio foi tratado como ausência de tokens no design, não como licença para inventar paleta. F07 deverá aplicar o tema dark à home inicial; nenhum seletor de tema foi criado.
- [x] Resolver com o proprietário layouts faltantes de landing, cadastro, login, código, recuperação e conta sem vínculo. Composição aprovada com base nos modelos existentes; `.agent/design-reference.md` registra os fluxos e a regra desktop (split para acesso, sidebar somente na área autenticada). As imagens selecionadas inspiram a home sem serem incorporadas.
- [x] Registrar divergências entre desenho e produto: rótulos de status, filtro por data e estados offline/sync. Nenhuma regra de domínio/schema foi alterada.
- [x] Implementar botão/variantes, campos e labels, feedback, loading, container e navegação inferior reutilizáveis em React/Tailwind, sem implementar telas de domínio.
- [x] Garantir foco visível, labels, contraste, alvos táteis e estados disabled/loading. Foco, labels e alvo mínimo de 44 px foram implementados. Por autorização do proprietário, o primário usa Tailwind 4 blue-600 (contraste estimado de 5,26:1 com branco); estados de feedback usam escalas Tailwind semânticas.
- [x] Versionar somente código e especificação textual. Inter é asset local do pacote `@fontsource-variable/inter`; ícones vêm de `lucide-react`. Nenhum `.pen` ou screenshot foi copiado para o repositório.

## Testes e aceite

- [x] Inventário com IDs e medidas reais; telas ausentes têm composição explicitamente aprovada e registrada, sem alegar fidelidade a frames inexistentes.
- [x] Componentes do app comparados visualmente às referências em viewport mobile e desktop, incluindo foco por teclado, contraste, loading e erro.
- [x] Inter local e ícones do app fazem parte do bundle, sem depender de pen.dev, Windows ou rede em runtime.
- [x] `pnpm check` passa; build sem arquivos externos. Nenhuma funcionalidade de domínio foi declarada por existir componente visual.

## Evidências

Concluída em 25/10/2026. MCP confirmou `WindOps.pen`, inspecionou `GhvhB`, `Q1cSKI`, `ilZvM`, `F4nqNr`, `QhQxw` e `FGvyG`, e leu as referências selecionadas `PHnew`, `BY82j`, `x288CH`. As imagens indicam uma direção escura, com azul/ciano e dashboards densos; `.agent/design-reference.md` registra inventário, medidas, tokens, composições autorizadas, sidebar desktop e limites de fidelidade. A captura MCP do app mostrou sidebar e formulários no desktop; no mobile, navegação inferior de quatro itens, alertas e estados de carregamento. Verificada largura de documento sem overflow em 402 px e foco visível por navegação Tab. As variantes de feedback informativa, sucesso, aviso e erro foram comparadas, além de input inválido e botão desabilitado. Inter e ícones estão no bundle local. `pnpm check` passou após remover a prévia temporária: lint e limites de módulos, typecheck, 11 testes e build. Nenhuma captura das referências foi adicionada ao repositório.
