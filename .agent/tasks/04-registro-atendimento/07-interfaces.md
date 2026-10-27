# I07 — Interfaces de chamados e lifecycle do catálogo

## Status

Em andamento desde 26/10/2026

- [ ] Task concluída

## Objetivo

Conectar o fluxo online de chamados e as ações administrativas do catálogo às APIs reais.

## Estado atual

I01–I06 concluídas. Em 26/10/2026, o proprietário confirmou o fluxo da sidebar: Home (pendentes/em andamento), Histórico (auditoria e futura conferência/recuperação de concluídas), Parques e Conta e configurações (conta, equipe e indicadores pessoais). O MCP confirmou `WindOps.pen` como documento ativo, sem seleção ativa; há referência completa da Home mobile e folha de ícones, mas faltavam telas próprias de Histórico, Parques e Conta. O proprietário autorizou compô-las a partir do fluxo descrito. A implementação está em progresso; validação manual de navegação com contas reais e dispositivos ainda não foi executada.

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
- [ ] Validar teclado, foco/diálogos, leitor de tela, temas e percurso em desktop/mobile com duas contas de teste; documentar as limitações sem reabrir ajustes antigos da slice 02 automaticamente.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Exercitar a interface com contas de teste admin/técnico: criar, editar própria, iniciar, devolver/liberar e ler eventos; confirmar controles e negativas da API.
- [ ] Validar retry/conflito na interface, parque sem turbina e equipamento arquivado; concluir a conferência visual em desktop/mobile. Integrações PostgreSQL de API/parks issues já passaram em I06.
- [x] Executar `pnpm check` e equivalentes diretos; registrar validação de build. `pnpm check` expirou sem saída (124), equivalentes passaram; evidência visual de referência MCP revisada, preview autenticado e dispositivos ainda pendentes.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: iniciada a composição autorizada. Implementados `apps/web/src/pages/issues-pages.tsx` (Home com lista/API, criação idempotente, detalhe, eventos antes/depois, ações e KPI/Conta), rotas `/historico`, `/conta`, `/chamados/:issueId`, wrappers de API de issues e lifecycle, navegação Lucide única em desktop/mobile e ações de arquivo/restauração em Parques. Histórico comunica que conclusão/recuperação depende da etapa 08. Conta concentra identidade, logout, tema, gestão de equipe por admin e KPIs ativos; não há escrita de perfil nem KPI concluído antes do lifecycle de issues. Cabeçalho autenticado não mostra nome/logout; Bell fica desativado enquanto notificações não estão disponíveis e Cloud só reflete `navigator.onLine`, sem afirmar sync concluído. Torre do Pencil portada pela geometria vetorial exata para logo, favicon, manifest PWA (192/512) e Apple touch icon (180). Não foi alterado o `.pen`.

Lint, boundaries, TypeScript de contracts/API/web, Vitest (3 arquivos/19 testes), build API e `vite build` passaram diretamente. `timeout 40s pnpm check` terminou com 124 sem saída. Os testes de integração issues/parks PostgreSQL de I06 cobrem os endpoints consumidos pela UI; não foram repetidos nesta etapa. Capturas MCP `QhQxw`, `FGvyG`, folha `D5Cuf7` e símbolo `Icon=Tower` (`LZscB`/`tA7il`) foram revisados; imagem raster da marca foi conferida. Falta percorrer a interface autenticada com dois membros de teste e validar teclado/leitor de tela em desktop/mobile. Nenhum dado operacional foi criado/modificado.
