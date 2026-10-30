# R01 — Auditoria reproduzível e baseline

## Status

Planejada.

- [ ] Task concluída

## Objetivo

Transformar a análise externa em achados reproduzíveis e uma baseline que permita refatorar com segurança.

## Escopo e exclusões

Revisar composição, módulos, frontend, persistência, testes e documentação. Sem reorganização em massa, novos recursos ou alterações de produto. Correções urgentes descobertas devem ganhar recorte e evidência próprios antes do refactor.

## Estado atual

A análise do zip identificou concentração de responsabilidades e duplicação. Inspeção preliminar confirmou pontos concretos listados no índice. Q05 permanece com aceite de navegador/Electric aberto; o erro de hooks/HMR reportado tem correção proposta, ainda sem confirmação no navegador do proprietário.

## Dependências

Arquitetura, memória, Q01–Q05 e evidências das slices 01–07. Pode começar antes do encerramento Q05; sua pendência bloqueia refactors posteriores até resolução explícita.

## Plano

- [ ] Conferir árvore atual e mudanças locais; preservar trabalho pré-existente e registrar revisão/base da auditoria.
- [ ] Mapear interfaces públicas e dependências reais, factories, consumidores e transações; revalidar cada recomendação externa e justificar as rejeitadas.
- [ ] Criar inventário de achados com arquivo/local, reprodução, impacto, severidade, decisão, etapa e aceite. Separar defeito funcional de dívida de manutenção.
- [ ] Mapear invariantes e testes existentes por fluxo; identificar lacunas de regressão relevantes, sem usar contagem de linhas/testes como meta.
- [ ] Executar pnpm check e integrações auth/workspaces/parks/issues em bancos descartáveis; registrar falhas e indisponibilidades reais.
- [ ] Reproduzir alternância Preview/Vite com worker pré-existente, hooks e WebSocket; validar correção sem apagar journal. Completar percurso Q05 ou mantê-lo explicitamente bloqueante.
- [ ] Revisar segurança transversal: auth/tenant, shapes, segredos/logs, validação de entrada, idempotência, efeitos externos e persistência offline.
- [ ] Consolidar ordem, riscos e alcance de R02–R08; detalhar a próxima task apenas com evidência suficiente.

## Contratos e dados afetados

Inventário e testes de caracterização se necessários. Fixtures sintéticas isoladas; nenhum dado operacional, segredo ou token em evidências. Sem mudança intencional de contrato/schema.

## Testes e aceite

Achados rastreáveis; baseline com resultado real e localização dos testes; riscos de transação/offline mapeados. Check verde não substitui o front/Electric de Q05. Itens indisponíveis permanecem abertos.

## Evidências

30/10/2026 — Plano criado; execução e baseline ainda pendentes.


Atualização de dependência — 30/10/2026: Q05 e slice 08 concluídas com aceite funcional do proprietário em Chrome/Edge (admin/técnico) e checks registrados. O bloqueio Q05 mencionado no planejamento original está resolvido. R01 é a próxima execução; nenhuma task R foi implementada por este encerramento.
