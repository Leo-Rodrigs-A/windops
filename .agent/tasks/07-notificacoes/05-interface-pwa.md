# N05 — Campainha e integração PWA

## Status

- Concluída em 28/10/2026 — validação confirmada pelo proprietário.

- [x] Task concluída

## Objetivo

Conectar avisos e permissão de push ao front existente.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Interface e integração do service worker implementadas e validadas pelo proprietário, incluindo push real em origem HTTPS.

## Dependências

N03/N04; referência visual confirmada.

## Plano

- [x] Confirmar documento Pencil pelo MCP: `WindOps.pen` está ativo e contém os componentes Notification/Bell em variações clara/escura, sem um frame específico para o painel/configuração; compor usando os padrões existentes. Documento não foi editado nem copiado.
- [x] Ativar Bell com contagem, lista paginada, leitura e navegação; usar Shadcn/tokens e largura interna padrão. Estados vazio, loading, erro, offline e revogação implementados; browser autenticado confirmou abertura e estado vazio.
- [x] Oferecer ativação de push por ação explícita, com estados permitido/negado/não suportado e opção de desativar neste aparelho; permissão não é solicitada automaticamente. Browser confirmou VAPID habilitado e permissão concedida; a inscrição real falhou no serviço push do browser integrado.
- [x] Integrar push e notificationclick ao service worker gerado pelo build sem substituir cache/update; o destino é validado como same-origin e issue UUID, janela existente é reutilizada e o destino inválido cai em `/app`.
- [x] Preservar partição por conta/workspace e limpar/desvincular recursos de push no logout; o fluxo não remove IndexedDB nem comandos offline pendentes.
- [x] Validar teclado/foco/leitor de tela, temas e viewports; provar que atualização do worker mantém fila offline e que aviso não revela dados da conta anterior. Proprietário confirmou que todos os itens da N05 foram testados e estão funcionando.

## Contratos e dados afetados

Interface da campainha, configuração de push e service worker existente.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: referência conferida via Pencil MCP. O `.pen` contém ícones/states de notificação e preferência clara/escura, sem layout específico de campainha/configurações; composição adotou o Dialog e Card já usados no produto.

28/10/2026: implementados painel acessível de notificações com contagem/listagem/cursor/leitura/navegação, atualização ao foco/retorno e polling de 60 s; configuração de Web Push com ação explícita, leitura de permissão e desinscrição do aparelho; limpeza best-effort no logout e ao detectar troca de conta/workspace; handlers `push`/`notificationclick` no service worker gerado, preservando cache/update. O push leva texto genérico e URL restrita ao caminho same-origin `/chamados/<UUID>`.

28/10/2026: quando a permissão está bloqueada nas opções do site, o botão permanece clicável para explicar como reabilitá-la; foco/retorno à página relê a permissão. Com permissão concedida e sem inscrição, “Concluir ativação” cria a inscrição sem solicitar permissão novamente; uma inscrição ativa mantém a ação de desativação disponível. Permissão de navegador concedida não significa que o aparelho já esteja inscrito no servidor.

`pnpm check` passou (lint/boundaries, typecheck, 54 testes e builds). O build gerou `service-worker.js` com os handlers. Browser autenticado confirmou a Bell habilitada, estado vazio e tela de configuração; responsividade foi inspecionada em viewport 390×844 e tema claro/escuro. A tentativa inicial no Chromium 152/Electron 44.9.3 integrado ao Pencil falhou antes do POST de inscrição; a validação posterior foi feita em Preview HTTPS temporário. A API aceitou a inscrição (`PUT 200`) e o proprietário confirmou que o push foi exibido. Em 28/10/2026, o proprietário confirmou também que todos os demais itens da N05 foram testados no front e estão funcionando, incluindo acessibilidade, temas, viewports, atualização/offline, partição e clique da notificação. N05 concluída; a validação integrada N06 também foi concluída, com limites de produção/dispositivos registrados em seu documento.
