# Referência visual — Wind Ops

## Fonte e verificação

- Consultado em 25/10/2026 pelo MCP do Pencil, sem operações de escrita no canvas.
- Documento ativo confirmado: `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`. O `.pen` permanece externo ao repositório.
- Os dados abaixo vêm das propriedades dos nós e screenshots exibidos pelo MCP; nomes e valores foram transcritos do documento, não inferidos de nomes de camada.
- Screenshot de referência foi inspecionado para `GhvhB` (guia), `F4nqNr` (componentes), `QhQxw` (home), paleta `Q1cSKI`, amostras `tRwro`, `fijJt`, `OlMqP`, `etbao`, `WZHSr` e home `FGvyG`. Os screenshots não foram salvos no Git.
- Em 25/10/2026, o proprietário selecionou três imagens de referência para a home: `PHnew` (`velora-ui-free-shadcn-landing-template.jpg`), `BY82j` (`Captura de tela 2026-10-24 213417.png`) e `x288CH` (`57e65b1b89c2a958475b9c5cd4ee066a.webp`). Foram vistas pelo MCP; os arquivos não foram copiados para o repositório.

## Frames e inventário

| ID                         | Frame                                  | Observações                                                                                                                                                                                   |
| -------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GhvhB`                    | Guia de Estilo                         | Paleta clara/escura, tons primários/neutros/semânticos, tipografia e ícones.                                                                                                                  |
| `Q1cSKI`                   | Color Palette                          | Swatches claro/escuro e escalas primary, zinc, information, success, warning e error.                                                                                                         |
| `ilZvM`                    | Typography                             | Inter; estilos de 12, 16 e 18 px, pesos regular/500/700 e amostra de line-height 24 px.                                                                                                       |
| `F4nqNr`                   | Componentes                            | Amostras de ícones, navegação, cartões de issue/status, busca, seletores, filtros, campo multilinha e formulário. Não há instâncias `ref` nem componentes reutilizáveis formais no documento. |
| `QhQxw`                    | Home Screen Actions - dark mode        | Variações da home em viewport de 402 × 874 px: base, sincronização, filtros, estados e formulário de issue.                                                                                   |
| `FGvyG`                    | Homescreen - base                      | Fundo escuro, cabeçalho, busca, lista e navegação inferior com quatro ícones.                                                                                                                 |
| `PHnew`, `BY82j`, `x288CH` | Imagens selecionadas pelo proprietário | Referências de estilo; não são layouts funcionais nem assets para o bundle.                                                                                                                   |

## Valores observados

### Cor

| Uso / escala                                | Valores do Pencil                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Fundo dark                                  | `#09090B`                                                                                                               |
| Superfície dark                             | `#27272A`                                                                                                               |
| Borda dark                                  | `#52525C`                                                                                                               |
| Texto dark principal/secundário             | `#FAFAFA` / `#E4E4E7`                                                                                                   |
| Texto auxiliar em exemplos                  | `#71717B`                                                                                                               |
| Fundo claro de amostras                     | `#FCFFFF`                                                                                                               |
| Texto claro principal                       | `#18181B`                                                                                                               |
| Primário, escala 50/300/400/500/600/800/950 | `#EDF0FF`, `#8EA7FF`, `#608BFF`, `#006FFE`, `#0058CC`, `#002C6F`, `#000F30`                                             |
| Neutros zinc, 50–950                        | `#FAFAFA`, `#F4F4F5`, `#E4E4E7`, `#E4E4E7`, `#9F9FA9`, `#71717B`, `#52525C`, `#3F3F46`, `#27272A`, `#18181B`, `#09090B` |
| Informação 100/300/500/800                  | `#D7EAFE`, `#A5D0FD`, `#0669D1`, `#03376D`                                                                              |
| Sucesso 100/300/500/800                     | `#E1EFE4`, `#9FCBA8`, `#5CA76C`, `#0C4318`                                                                              |
| Aviso 100/300/500/800                       | `#FFF6DE`, `#FEEAA9`, `#EFCF29`, `#897611`                                                                              |
| Erro 100/300/500/800                        | `#FFE4E6`, `#FFA1AD`, `#EC003F`, `#8B0836`                                                                              |

Há nomes de camadas repetidos/incorretos na escala primary e zinc (por exemplo, vários swatches nomeados `primary-300` e `zinc-300`). Os valores acima seguem os fills reais; não foram tratados como variáveis de design. `GetVariables()` não listou variáveis registradas.

O proprietário autorizou cores Tailwind para atingir contraste AA. O primário da app usa `blue-600` do Tailwind 4 instalado (`oklch(54.6% 0.245 262.881)`, equivalente sRGB aproximado `#155DFC`), com contraste estimado em 5,26:1 com branco. Estados semânticos usam as escalas Tailwind de blue/green/amber/red.

### Tipografia e componentes

- Família observada: Inter. Hierarquia apresentada: 12 px regular para texto compacto, 16 px/500 para corpo e 18 px/700 para título; espécimes também mostram line-height de 24 px.
- Home: frame 402 × 874 px; barra inferior mede aproximadamente 67 px e apresenta quatro ícones. Texto comum nas linhas da lista usa 12 px.
- Campo multilinha: borda `#52525C`, raio 12 px e padding `[12, 12, 48, 12]` no frame de amostra.
- Barra de busca: borda `#52525C`, raio 999 px, padding `[8, 8, 8, 16]`; botão de filtro circular.
- Filtros e formulário: superfície `#27272A`, contorno `#52525C`, campos/seletores com raio 8 px; botões primários azuis. A sheet de formulário tem cantos superiores de 24 px.
- A navegação indica estado ativo por linha superior branca de 3 px; os demais ícones ficam em cinza.
- Lucide já é dependência do app (`components.json` declara `lucide`); a família Inter foi incluída como pacote local para entrar no bundle, sem URL do Windows, Pencil ou fonte externa em runtime.
- Botões e campos têm altura mínima de 44 px para toque/foco; a navegação mantém os 67 px observados. O container de página oferece apenas largura fluida, padding responsivo e um limite genérico de 1280 px: o documento não contém uma composição desktop aprovada.
- O proprietário determinou usar Shadcn UI em todos os componentes. Buttons, fields, alerts, skeletons e sidebar usam componentes gerados pelo CLI Shadcn; composições de navegação/campos usam esses primitives. A regra aplica-se às telas futuras.

## Lacunas e divergências de produto

- O documento ativo não tem telas identificáveis de landing, cadastro, login, código de segunda etapa, recuperação ou conta sem vínculo. O proprietário autorizou compor esses fluxos com padrões existentes, sem afirmar fidelidade a frames inexistentes. Especificação aprovada para orientar F07:
  - Landing pública: identidade Wind Ops, texto curto e ações de entrada/cadastro; fundo escuro, luz azul discreta, headline de alto contraste e preview de produto abstrato, sem dados operacionais fictícios.
  - Entrada/cadastro: no desktop, duas colunas — identidade/contexto à esquerda e formulário Shadcn em superfície à direita; mobile em coluna única. Não usar sidebar antes da autenticação.
  - Código, recuperação e redefinição: manter o mesmo shell de acesso, um formulário por etapa, mensagens via Alert Shadcn e foco no campo/erro após navegação. O código é validado pelo servidor; countdown local nunca autoriza acesso.
  - Conta sem workspace: explicar que a conta está autenticada sem vínculo operacional, permitir sair; não exibir dados operacionais nem sidebar de negócio.
  - Home autorizada: desktop com sidebar Shadcn do workspace à esquerda, 16rem e recolhível, navegação textual e área principal escura. Mobile usa a navegação inferior de quatro ícones da referência. As imagens selecionadas inspiram paleta azul/noturna, pontos de luz e superfícies; não serão copiadas como backgrounds nem transformarão a home operacional em landing promocional.
- Os desenhos usam “Aberto”, “Resolvendo” e “Concluído”; o produto documentado usa Pendente, Em andamento e Concluída. Os filtros por data e estados de sincronização/offline aparecem nas variantes visuais. F06 não altera nomes do domínio, schema ou comportamento de sync.
- O primário original `#006FFE` com branco ficava em aproximadamente 4,46:1. Conforme autorização do proprietário, a aplicação usa `blue-600` do Tailwind 4 (`#155DFC` aproximado), estimado em 5,26:1 com branco.
- As screenshots foram inspecionadas visualmente. O frame de home aparece íntegro na viewport; a placa grande de componentes fica densa quando vista inteira, então os exemplos relevantes foram ampliados individualmente. O MCP informou alguns bounds parcialmente/totalmente cortados em itens da prancha de componentes; revisar o nó afetado antes de portar qualquer exemplo que dependa dele.

## Implementação no app

- Tokens CSS semânticos para modo claro e dark em `apps/web/src/styles.css`. A home inicial deverá selecionar `data-theme="dark"` em F07; não foi criado seletor de tema.
- `Button`, campos acessíveis, feedback, loading, container de página e navegação inferior em `apps/web/src/components/ui/`.
- Inter está empacotada localmente; `lucide-react` fornece ícones no bundle. `.pen`, screenshots e caminhos do Windows não são dependências do build/runtime.

## Consulta I07 — 26/10/2026

- Documento ativo confirmado novamente pelo MCP Windows: `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`. A seleção do editor estava vazia nessa consulta; não se presumiu que houvesse uma seleção escondida.
- Foram revisados `QhQxw` (Home Screen Actions - dark mode), `FGvyG` (Home base), `D5Cuf7` (folha de ícones) e `LZscB` / `tA7il` (`Icon=Tower`). A Home continua 402 × 874, com busca, filtros, cards e navegação inferior de quatro ícones. A folha separa ícones Lucide como `house`, `history`, `gallery-vertical-end`, `user-round`, `calendar`, `panel-left`, `inbox`, `search`, `plus`, `bell` e estados de Cloud.
- O proprietário autorizou compor as telas não existentes de Histórico, Parques e Conta e configurações usando a direção escrita: Home lista pendentes/em andamento; Histórico reserva auditoria e futuras recuperação/conferência de concluídas; Parques gerencia parques/turbinas; Conta agrupa conta, equipe e indicadores pessoais. A implementação continua sem conclusão/recuperação de issues, que dependem da etapa 08.
- A geometria do path `tA7il` foi portada sem alterações para `TowerMark`, favicon SVG e ícone de instalação. Geraram-se também PNGs 192, 512 e Apple touch 180 a partir do SVG. O `.pen` permaneceu somente leitura e externo ao repositório.
- A sidebar e navegação mobile usam os ícones Lucide `House`, `History`, `GalleryVerticalEnd` e `UserRound`. Cabeçalhos autenticados agrupam Bell (integração de notificações ainda desativada) e Cloud (`navigator.onLine` apenas; não indica sincronização durável). Tema e logout ficam em Conta e configurações.
