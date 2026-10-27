# I07 — Interfaces de chamados e lifecycle do catálogo

## Status

Concluída em 26/10/2026 por aceite do proprietário

- [x] Task concluída

## Objetivo

Conectar o fluxo online de chamados e as ações administrativas do catálogo às APIs reais.

## Estado atual

I01–I06 concluídas. Em 26/10/2026, o proprietário confirmou o fluxo da sidebar: Home (pendentes/em andamento), Histórico (auditoria e futura conferência/recuperação de concluídas), Parques e Conta e configurações (conta, equipe e indicadores pessoais). O MCP confirmou `WindOps.pen` como documento ativo, sem seleção ativa; há referência completa da Home mobile e folha de ícones, mas faltavam telas próprias de Histórico, Parques e Conta. O proprietário autorizou compô-las a partir do fluxo descrito. As funcionalidades foram implementadas e o proprietário confirmou todas as funcionalidades e aprovou a slice em 26/10/2026. Essa confirmação é o aceite funcional; não representa aferição independente de acessibilidade ou de dispositivos específicos.

## Dependências

I03–I06 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Lista, formulário, detalhe/histórico, conta/indicadores e ações administrativas do catálogo; conclusão foi originalmente excluída e adicionada pela I09 após relato do proprietário. Sem reabertura, fila offline, push ou alegar sincronização durável. Composição das telas ausentes autorizada pelo proprietário em 26/10/2026.

## Plano de implementação

- [x] Reconfirmar com proprietário o documento Pencil ativo antes da consulta pelo MCP Windows; registrar referências em design-reference.md sem copiar/editar .pen. A seleção estava vazia; o proprietário autorizou compor as telas ausentes com o fluxo escrito.
- [x] Conciliar rótulos do desenho com Pendente/Em andamento e ordenação antigas primeiro na Home; a I09 direcionou concluídas e eventos em ordem recente primeiro.
- [x] Usar Shadcn, tokens, temas e navegação existente para Home/lista, filtros de status, criação sem título, edição do criador e detalhe com histórico paginado; compor Histórico e Conta e configurações conforme autorizado.
- [x] Mostrar iniciar/devolver/liberar conforme ator e estado; API continua autoridade. A conclusão foi acrescentada depois na I09.
- [x] Adicionar exclusão/arquivo/restauração admin no catálogo com confirmação e consequência explícita; tratar resposta do servidor para associação concorrente e separar catálogo inativo da seleção ativa em novos chamados.
- [x] Implementar carregamento, vazio, erro, sessão expirada, revogação e conflitos preservando texto digitado; retry mantém chave idempotente na mesma sessão. Não prometer recuperação após reload.
- [x] Comunicar que gravações exigem conexão e não confirmar sucesso antes do commit. Garantia offline permanece na etapa 07 do roadmap.
- [x] Registrar aceite funcional do proprietário para as funcionalidades implementadas. Teclado, foco/leitor de tela e dispositivos específicos não foram aferidos separadamente e permanecem limitação aceita no encerramento.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Registrar confirmação do proprietário de que todas as funcionalidades implementadas foram confirmadas; integrações já comprovam autorização e negativas da API.
- [x] Registrar aceite do proprietário para a interface funcional; retry/conflitos e lifecycle têm cobertura integrada PostgreSQL. Não alegar certificação visual/a11y nem teste em dispositivo específico.
- [x] Executar `pnpm check` e equivalentes diretos; registrar validação de build. `pnpm check` expirou sem saída (124), equivalentes passaram; evidência visual de referência MCP revisada, preview autenticado e dispositivos ainda pendentes.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: implementados `apps/web/src/pages/issues-pages.tsx` (Home com lista/API, criação idempotente, detalhe, eventos antes/depois, ações e KPI/Conta), rotas `/historico`, `/conta`, `/chamados/:issueId`, wrappers de API de issues e lifecycle, navegação Lucide em desktop/mobile e ações de arquivo/restauração em Parques. Histórico comunica que conclusão/recuperação depende da etapa 08. Conta concentra identidade, logout, tema, gestão de equipe por admin e KPIs ativos; não há escrita de perfil nem KPI concluído antes do lifecycle de issues. Cabeçalho autenticado não mostra nome/logout; Bell fica desativado enquanto notificações não estão disponíveis e Cloud só reflete `navigator.onLine`, sem afirmar sync concluído. Torre portada para logo, favicon e ícones PWA. O proprietário confirmou todas as funcionalidades implementadas e aprovou a slice em 26/10/2026; este aceite não certifica teclado/leitor de tela nem dispositivos específicos. O `.pen` não foi alterado.

Lint, boundaries, TypeScript de contracts/API/web, Vitest (3 arquivos/19 testes), build API e `vite build` passaram diretamente; `timeout 40s pnpm check` terminou com 124 sem saída. As integrações PostgreSQL de I06/I08 cobrem os endpoints consumidos pela UI. Capturas MCP `QhQxw`, `FGvyG`, folha `D5Cuf7` e símbolo `Icon=Tower` (`LZscB`/`tA7il`) foram revisados. Aceite funcional do proprietário registrado; não há alegação de teste específico de acessibilidade ou dispositivo.
