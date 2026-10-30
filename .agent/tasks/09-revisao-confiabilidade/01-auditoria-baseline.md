# R01 — Auditoria reproduzível e baseline

## Status

Concluída em 30/10/2026; inventário e baseline registrados, reparos seguem em tasks próprias.

- [x] Task concluída

## Objetivo

Transformar a análise externa em achados reproduzíveis e uma baseline que permita refatorar com segurança.

## Escopo e exclusões

Revisar composição, módulos, frontend, persistência, testes e documentação. Sem reorganização em massa, novos recursos ou alterações de produto. Correções urgentes descobertas devem ganhar recorte e evidência próprios antes do refactor.

## Estado atual

A análise do zip identificou concentração de responsabilidades e duplicação. Inspeção preliminar confirmou pontos concretos listados no índice. Q05 concluída; proprietário confirmou também a alternância Preview/Vite durante R01.

## Dependências

Arquitetura, memória, Q01–Q05 e evidências das slices 01–07. Pode começar antes do encerramento Q05; sua pendência bloqueia refactors posteriores até resolução explícita.

## Plano

- [x] Conferir árvore atual e mudanças locais; preservar trabalho pré-existente e registrar revisão/base da auditoria.
- [x] Mapear interfaces públicas e dependências reais, factories, consumidores e transações; revalidar cada recomendação externa e justificar as rejeitadas.
- [x] Criar inventário de achados com arquivo/local, reprodução, impacto, severidade, decisão, etapa e aceite. Separar defeito funcional de dívida de manutenção.
- [x] Mapear invariantes e testes existentes por fluxo; identificar lacunas de regressão relevantes, sem usar contagem de linhas/testes como meta.
- [x] Executar pnpm check e integrações auth/workspaces/parks/issues em bancos descartáveis; registrar falhas e indisponibilidades reais.
- [x] Reproduzir alternância Preview/Vite com worker pré-existente, hooks e WebSocket; validar correção sem apagar journal. Completar percurso Q05 ou mantê-lo explicitamente bloqueante.
- [x] Revisar segurança transversal: auth/tenant, shapes, segredos/logs, validação de entrada, idempotência, efeitos externos e persistência offline.
- [x] Consolidar ordem, riscos e alcance de R02–R08; detalhar a próxima task apenas com evidência suficiente.

## Contratos e dados afetados

Inventário e testes de caracterização se necessários. Fixtures sintéticas isoladas; nenhum dado operacional, segredo ou token em evidências. Sem mudança intencional de contrato/schema.

## Testes e aceite

Achados rastreáveis; baseline com resultado real e localização dos testes; riscos de transação/offline mapeados. Check verde não substitui o front/Electric de Q05. Itens indisponíveis permanecem abertos.

## Evidências

30/10/2026 — Plano criado; execução e baseline ainda pendentes.


Atualização de dependência — 30/10/2026: Q05 e slice 08 concluídas com aceite funcional do proprietário em Chrome/Edge (admin/técnico) e checks registrados. O bloqueio Q05 mencionado no planejamento original está resolvido. R01 é a próxima execução; nenhuma task R foi implementada por este encerramento.


## Entrega R01 — 30/10/2026

Ver [baseline e inventário](baseline-r01.md): commit b718743 limpo, 13 achados separados por tipo/prioridade, mapa de composição/transações, invariantes, testes e decisões. pnpm check (60 testes/builds) e integrações auth/workspaces/parks/issues passaram. Alternância Preview/Vite confirmada pelo proprietário, sem alegar observação direta. Achado alto A01 reproduzido com valores fictícios: query OAuth aparece em req.url nos logs. [R01A](01a-sanitizacao-logs.md) é a próxima task, bloqueante antes dos refactors; R02 enriquecida com consumidores concretos. Nenhuma fonte/schema/infra alterada nesta auditoria.

Verificação documental final: 5 documentos e 11 links locais válidos; git diff --check aprovado.
