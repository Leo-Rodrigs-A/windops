# L06 — Validação integrada e encerramento

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Comprovar o lifecycle completo e registrar limites reais.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Validação integrada concluída com bancos descartáveis; limites de dispositivos/produção seguem no roadmap 11.

## Dependências

L01–L05. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [x] Executar pnpm check; investigar travamento recorrente do launcher e registrar diagnóstico. Se indisponível, executar componentes diretos com comandos/resultados explícitos, sem declarar check aprovado.
- [x] Executar integrações auth/workspaces/parks/issues e PostgreSQL/Electric, migrations/upgrade/restore e permissões conforme mudanças; usar bancos descartáveis.
- [x] Cobrir concluir→reabrir, arquivar→reativar, bloqueio de Concluída, equipamento inativo, revogação e corridas.
- [x] Validar reconciliação de arquivo remoto com comando offline pendente após restart e retry idempotente após falha de ACK, sem duplicar eventos; testes existentes cobrem essas etapas em store/sender e servidor, e o proprietário confirmou o percurso funcional no front.
- [x] Regressar espera de uma hora pelo relógio do banco e edição de relato apenas offline antes do envio; não repetir toda bateria S06–S09 já aceita sem risco novo.
- [x] Atualizar evidências, índice, arquitetura, memória e roadmap somente após validação; Android/iPhone/HTTPS e evicção real continuam na produção, sem declarar suporte móvel.

## Contratos e dados afetados

Testes de integração e documentação de entrega; notificações permanecem fora do escopo.

## Testes e aceite

Nenhuma pendência perdida; histórico imutável; permissões tenant e idempotência comprovadas; limitações e aceite funcional registrados. Sugerir commit da entrega real. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026 — `pnpm check` passou (lint/boundaries, typechecks, Vitest: 9 arquivos/54 testes e builds); o launcher não travou nesta execução. `docker compose -f infra/compose.dev.yml ps` confirmou PostgreSQL, Electric e Mailpit saudáveis. Passaram `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:parks-integration` e `pnpm test:issues-integration`; os scripts usaram banco PostgreSQL descartável, sem alterar dados operacionais. A integração issues cobriu conclusão/reabertura, arquivo/consulta/reativação, relato limpo, bloqueio de Concluída, lifecycle de equipamento, revogação, revisão/idempotência, espera de uma hora via relógio do banco e corridas.

Os testes offline existentes validam arquivo remoto preservado após restart junto com comando local pendente e conflito/reconciliação; o sender valida replay após falha simulada ao persistir ACK com um único evento remoto. O proprietário confirmou que testou o percurso final no front e está funcionando. O smoke Electric e a bateria S06–S09 já constam como aprovados na S09; não foram repetidos sem mudança de risco. Sem alterações de fonte/schema/infra nesta task. Android/iPhone, HTTPS em aparelho e quota/evicção física seguem sem evidência de produção e não são declarados suportados. `git diff --check` passou após atualização documental.
