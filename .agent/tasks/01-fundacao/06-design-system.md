# F06 — Referências e componentes visuais

## Status e dependências

Planejada. Depende de acesso ao documento externo; pode avançar em paralelo ao backend depois de F01.

- [ ] Task concluída.

## Objetivo e escopo

Extrair uma especificação visual verificável e implementar os tokens/componentes necessários às interfaces da fundação, reaproveitando React/Tailwind/ShadcnUI existentes. Não redesenhar o `.pen`, gerar site externo ou copiar o documento para o Git.

## Referência conhecida

Ver documento e IDs no [índice da slice](README.md). Há guia de estilo claro/escuro, tipografia Inter, componentes e home escura com variações. Na leitura inicial, não há variáveis cadastradas nem componentes reutilizáveis formais. A ausência de telas de auth é uma lacuna a confirmar, não autorização para inventar layouts definitivos.

## Plano de implementação

- [ ] Reconsultar `get_app_state` no MCP do Windows e confirmar `WindOps.pen`; se outro documento estiver ativo, esclarecer antes da extração. Ler via MCP a árvore, propriedades e screenshots dos frames relevantes, sem executar operações de escrita no design.
- [ ] Criar `.agent/design-reference.md` com data, nome do documento, IDs/fontes das decisões e inventário de telas/componentes/estados. Registrar medidas e cores reais, não inferir valores a partir dos nomes das camadas.
- [ ] Conferir `GhvhB`, `F4nqNr` e `QhQxw`/`FGvyG`, incluindo botões, campos, superfícies, bordas, texto, espaçamentos, raios, ícones e tipografia. Distinguir frame do produto de imagem de inspiração e chrome do sistema operacional; não reproduzir barra de status/teclado do aparelho como UI web.
- [ ] Mapear as propriedades do guia para tokens semânticos CSS do app, com modos claro/escuro conforme referência. Documentar que `GetVariables()` vazio exige extração dos elementos, não preenchimento por paleta inventada. Home inicial usa a referência escura; não criar seletor de tema sem fluxo previsto.
- [ ] Resolver com o proprietário os layouts faltantes de landing, cadastro, login, código, recuperação e conta sem vínculo: obter referência ou aprovação explícita de composição com os componentes existentes. Enquanto isso, avançar tokens e componentes conhecidos; deixar telas afetadas bloqueadas, não marcar fidelidade visual concluída.
- [ ] Registrar divergências entre desenho e produto: rótulos de status, filtro por data e estados offline/sync. Não alterar schema/regras de negócio nem ampliar a slice com base apenas nessas camadas.
- [ ] Implementar tokens e componentes comuns necessários: botão e variantes utilizadas, campo/label, feedback de validação, mensagem de erro/sucesso, carregamento, container de página e navegação da home. Reusar padrões existentes e evitar importar biblioteca inteira para estados fora do escopo.
- [ ] Garantir foco visível, labels, contraste, alvos táteis e estados disabled/loading; não depender só de cor. Se um valor do desenho prejudicar acessibilidade, registrar a divergência e a correção acordada, sem ocultar a diferença.
- [ ] Versionar somente implementação e especificação textual. Assets indispensáveis exigem origem/permissão e decisão explícitas; screenshots de comparação podem ficar em artefatos temporários fora do repositório, nunca como cópia integral do projeto `.pen`.

## Testes e aceite

- [ ] Inventário com IDs e medidas reais; layouts faltantes resolvidos ou task ainda não concluída. Não afirmar revisão visual apenas com listagem de nós.
- [ ] Componentes comparados às screenshots do documento em viewport mobile e desktop; registrar dimensões usadas, foco, contraste, loading/erro e teclado.
- [ ] Fonte Inter e ícones necessários carregam no app sem depender do pen.dev aberto ou de caminhos do Windows.
- [ ] `pnpm check` passa; build sem acesso aos arquivos externos. Nenhuma funcionalidade de domínio é declarada implementada por existir um componente visual.

## Evidências

Pendente. Registrar `.agent/design-reference.md`, IDs consultados, telas aprovadas/ausentes, comparação visual e testes. A leitura estrutural feita na preparação não conclui esta task.
