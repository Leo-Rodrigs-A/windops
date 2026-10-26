# P05 — Interface de parques e turbinas

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Entregar catálogo navegável para técnicos e gestão online para administradores.

## Estado atual

P03 e P04 concluídas. A API fornece consultas tenant-scoped e operações admin para parques/turbinas. `WindOps.pen` contém referências de home mobile e componentes, mas não desenha o catálogo.

## Dependências

P03 e P04 concluídas; acesso admin dev existente. Ver [índice da slice](README.md).

## Escopo e exclusões

Rotas web, cliente API e componentes Shadcn para catálogo; sem telas de chamados, PWA ou persistência offline.

## Plano de implementação

- [x] Reconfirmar documento aberto no Pencil Windows antes de consultar referências. Registrar referência e eventuais lacunas; compor telas ausentes com modelos existentes conforme autorização anterior, sem editar/copiar .pen.
- [x] Adicionar navegação de Parques à sidebar desktop e navegação mobile; lista de parques e detalhe com suas turbinas, com acesso para ambos os cargos.
- [x] Implementar confirmação Shadcn de cadastro admin com próximo código sequencial pré-calculado e edição manual acessível; ocultar controles administrativos do técnico sem substituir segurança da API.
- [x] Reutilizar campos, espaçamentos, bordas, tema claro/escuro persistido, dropdown com largura do gatilho e scrollbar global. A implementação usa breakpoints adaptáveis e conteúdo sem tabelas largas.
- [x] Tratar carregamento, vazio, busca/paginação, falha de rede, sessão expirada e perda de membership; não exibir gravação como concluída antes da confirmação do servidor.
- [x] Em conflito de revisão, preservar texto digitado e oferecer atualização/revisão explícita; não reenviar sobrescrevendo silenciosamente. Em timeout de criação, permitir conferir catálogo paginado antes de nova tentativa.
- [x] Preservar retorno à home, nome na top bar, logout e alternância de tema. Não apresentar botões de desativação ou funcionalidades futuras como disponíveis.

## Contratos e dados afetados

Rotas web, cliente API e componentes Shadcn para catálogo; sem telas de chamados, PWA ou persistência offline. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [x] Proprietário confirmou uso em admin/técnico e navegação desktop/mobile; capturas confirmam a tela e o novo diálogo de código sequencial. Erros/revisões têm tratamento explícito e automação cobre os contratos da API. Não afirmar teste em aparelho físico.
- [x] Registrar comandos, resultados, limitações e arquivos alterados.

## Evidências

Implementação em 26/10/2026: adicionada página `/parques`, serviços web para GET/POST/PATCH, navegação da sidebar e bottom navigation, seleção de parque e detalhe de turbinas, busca/paginação e controles Shadcn admin. Cadastro gera próximo código disponível com prefixo P/T e mínimo de três dígitos (`P001`, `T001`) e pede confirmação sem campo de texto; a edição administrativa ainda permite corrigir o código. Se outro admin ocupar o código durante a confirmação, um novo código é sugerido e exige confirmação explícita. Revisão obsoleta mantém o código digitado na edição e exige ação explícita para atualizar `expectedRevision`; erro de rede em criação oferece reconciliação paginada antes de retry. Esconder controles do técnico é apenas UX; autorização continua no servidor. Nenhuma função de desativação foi exposta.

Referência reconfirmada via MCP: documento ativo `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`. Inspecionados `Homescreen - base`, `Homescreen - add issue click`, `Homescreen - add issue form` e componentes/tokens. O arquivo tem referências mobile e componentes, sem tela de catálogo ou desktop de parques; composição seguiu a autorização anterior para usar a sidebar e os padrões da tela Equipe. Documento `.pen` não foi alterado.

Validação final em 26/10: Biome, boundaries, typechecks de contracts/API/web, 18 testes Vitest em 3 arquivos, build Vite e `git diff --check` passaram. `pnpm check` ficou sem saída por 11s e foi interrompido; equivalentes diretos passaram. Capturas do proprietário no navegador normal confirmaram desktop autenticado e diálogo sem campo, mostrando `Parque P002`; o proprietário confirmou sidebar desktop, navegação inferior mobile e uso esperado nos dois cargos. O diálogo não foi confirmado na captura, portanto nenhum dado foi gravado por esse teste. A instância browser MCP usa sessão separada. Não foi alegado teste em aparelho físico.
