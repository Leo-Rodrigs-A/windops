# E06 — Interfaces de equipe e convite

## Status e dependências

Concluída em 25/10/2026. Depende de E01 e E03–E05.

- [x] Task concluída; a validação integrada com duas contas e dispositivos fica na E07.

## Objetivo e escopo

Integrar as funções administrativas à sidebar e permitir que o convidado conclua o vínculo pela interface. Usar componentes Shadcn e API real.

## Plano de implementação

- [x] Reconfirmar pelo MCP Windows o documento Pencil pretendido e inspecionar as referências disponíveis; registrar inventário sem editar/copiar arquivos `.pen`.
- [x] Compor as telas de equipe/convite a partir do design system existente e da autorização anterior do proprietário para idealizar telas ausentes com sidebar desktop.
- [x] Implementar navegação administrativa e tela de equipe com membros, cargos, busca/paginação, estados vazios, carregamento e erros recuperáveis.
- [x] Implementar consulta de contas sem vínculo e formulário de convite com e-mail, cargo Técnico padrão, validação, progresso e resultado de entrega.
- [x] Exibir estados de convite e reenvio, sem afirmar leitura de e-mail quando ela não é comprovada.
- [x] Implementar promoção e revogação com confirmação, alvo identificado, submissão protegida contra repetição e atualização após resposta da API.
- [x] Implementar página de convite com continuidade por cadastro/login/código, conta incompatível sem consumo do token e troca de conta.
- [x] Após aceite, atualizar `/api/me` e contexto; após mudança de autorização, renovar a sessão e deixar o guard decidir o redirecionamento.
- [x] Proteger URLs e mutações no servidor; os controles visuais complementam, mas não substituem a autorização tenant.
- [x] Usar componentes Shadcn em formulários, diálogos, feedback, navegação e tabelas; compor layout desktop com sidebar e navegação mobile.
- [x] Uniformizar contraste de bordas, padding dos cards/campos e cantos dos controles; oferecer troca de tema claro/escuro persistida no navegador.
- [x] Usar rótulos, nomes acessíveis, estados de foco dos componentes e alvos responsivos; a inspeção manual de teclado/leitor e o percurso visual autenticado serão registrados na E07.

## Validação e aceite

- [x] A interface está conectada às operações administrativas da API, com integração cobrindo busca de membros, listagem de convites sem token e negação a técnico.
- [ ] Percurso de admin e convidado exercitado na UI com duas contas; reservado à E07.
- [x] Técnico não recebe navegação de gestão; endpoints mantêm autorização por tenant no servidor.
- [x] Erros de API, expiração, e-mail incompatível e alteração de autorização têm estados compreensíveis no código; percurso manual reservado à E07.
- [ ] Comparação autenticada, teclado e leitor de tela registrados na E07. Checks equivalentes a `pnpm check` foram executados diretamente; o shim de `pnpm check` travou sem saída nesta sessão.

## Evidências

Implementada em 25/10/2026. A referência ativa confirmada pelo MCP foi `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`; ela contém home, guia de estilo, componentes e referências, sem quadro específico para equipe/convite. As telas novas seguem o design system existente e a autorização anterior do proprietário para compor telas ausentes com sidebar desktop. Nenhum `.pen` foi alterado.

Criada leitura paginada de convites sem expor tokens e busca de membros; a tela usa os endpoints existentes de diretório, convite, reenvio, promoção, revogação e aceite. A integração PostgreSQL descartável passou as novas verificações de listagem sem token, bloqueio para técnico e busca tenant-scoped. TypeScript, Vitest (16 testes), limites de módulos, Biome e builds da API/web passaram. O comando `pnpm check` travou no shim local; seus checks equivalentes foram executados diretamente. O navegador MCP estava sem sessão autenticada, então não houve convite real nem inspeção visual autenticada; essas verificações fazem parte de E07. Banco dev e contas reais não foram alterados.

Revisão visual antes do commit: bordas compartilhadas suavizadas (dark `#35353b`), espaçamento interno de cards uniformizado em 20px e campos alinhados em 44px com padding horizontal de 12px. Adicionada alternância claro/escuro com preferência `windops.theme` em `localStorage`, aplicada antes da primeira renderização e sincronizada entre abas. O navegador MCP confirmou a troca e a persistência após recarregar; Biome (125 arquivos), TypeScript web e build Vite passaram. Captura da tela de login no navegador integrado excedeu o tempo limite; a landing foi inspecionada nos dois temas.

Correção solicitada após revisão do proprietário: `space-y-4` não criava distância entre campos porque os componentes Shadcn `Field` são fieldsets com margem zerada. Formulários passaram a usar `flex flex-col gap-4`; o navegador confirmou 16px entre campos e ações no login. O Select agora usa superfície elevada, contorno de foco azul e opções de 32px, seguindo a referência enviada. Captura visual do navegador integrado continuou excedendo o tempo limite; TypeScript, Biome e build final foram repetidos.

Barra de rolagem: regras globais aplicam largura fina, trilho transparente e indicador arredondado com tons próprios para light/dark, inclusive em containers internos de overflow. Não há componente independente de scrollbar na aplicação; o Select continua ocultando a barra do viewport por decisão do primitive Radix.
