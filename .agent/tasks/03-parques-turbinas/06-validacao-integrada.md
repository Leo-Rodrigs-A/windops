# P06 — Validação integrada e encerramento

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Comprovar o catálogo completo e registrar limites antes de iniciar chamados.

## Estado atual

P01–P05 implementadas. Catálogo `/parques` oferece consulta para admin/técnico e criação/edição somente para admin. Em 26/10/2026, as integrações descartáveis, migrações e builds passaram. O proprietário confirmou no navegador normal do dev e em Android físico os fluxos de admin criar/editar parque e turbina e técnico consultar sem editar; no Android, confirmou que tudo funcionou normalmente.

## Dependências

P01–P05 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Evidências de testes, documentação e eventuais correções necessárias; não abrir automaticamente a slice de issues.

## Plano de implementação

- [x] Executar `pnpm check` e integrações de catálogo, workspaces, autenticação e migrações impactadas. O shim ficou sem saída por 30s e foi interrompido; os equivalentes diretos e integrações reais foram executados e registrados abaixo, sem declarar `pnpm check` aprovado.
- [x] Em fixtures descartáveis, validar dois tenants, ambos os cargos, sessão incompleta, revogação concorrente, duplicidade concorrente e revisão obsoleta.
- [x] Validar instalação vazia/upgrade preservando dados e persistência após reinício; comprovar que autenticação/equipe continuam funcionando.
- [x] Exercitar no dev real o percurso admin cadastra/edita parque e turbina e técnico consulta sem editar. O proprietário confirmou os fluxos; não houve limpeza de contas nem inclusão automática de inventário.
- [x] Conferir desktop e Android físico; o proprietário confirmou cadastro/edição de admin e consulta de técnico funcionando normalmente no Android. iPhone não validado.
- [x] Encerrar exposição temporária: processos Vite 5175 e API 3002 encerrados; portproxy e regra de firewall removidos em PowerShell como Administrador. Verificação confirmou configuração vazia e porta LAN 5175 fechada.
- [x] Revisitar o registro de inconsistências mobile da slice 02: problemas antigos permanecem adiados e não foram declarados resolvidos sem evidência; nenhuma regressão adicional foi relatada na P05.
- [x] Atualizar checkboxes, índice, memória e roadmap com evidências datadas. Manter roadmap 05 parcialmente atendido, pois lifecycle com issues e catálogo offline continuam pendentes.

## Contratos e dados afetados

Evidências de testes, documentação e eventuais correções necessárias; não abrir automaticamente a slice de issues. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [x] Aceite: admin grava e técnico apenas consulta; isolamento real; conflitos sem perda silenciosa; dados sobrevivem reinício; percurso UI validado em desktop e Android físico; recursos temporários removidos. Limitações documentadas.
- [x] Registrar comandos, resultados e limitações; completar o índice e a memória.

## Evidências

Validações em 26/10/2026:

- `pnpm check`: permaneceu sem saída por 30s; interrompido com Ctrl-C (exit 130), não aprovado.
- Equivalentes diretos: Biome em 138 arquivos, boundaries, TypeScript contracts/API/web, build da API, build Vite e 18 testes Vitest passaram. O build web incluiu o chunk `parks-page`.
- `pnpm test:parks-integration`: passou em banco descartável; isolamento entre tenants, admin/técnico, sessão incompleta, revogação, unicidade concorrente, revisão obsoleta e isolamento da turbina pelo parque.
- `pnpm test:workspaces-integration`: passou em banco descartável, incluindo membership, convite, Mailpit, rate limits, concorrência e isolamento.
- `pnpm test:auth-integration`: passou em banco descartável com Mailpit; verificação de e-mail, senha, vínculo Google, barreira de sessão pendente, OTP, restart e recuperação.
- `pnpm db:empty-check`: passou instalação vazia, migração repetida, constraints, restart, permissões e upgrade preservando workspace.
- `pnpm db:restore-check`: passou restauração descartável (`workspaces:migrations=1:5`); banco de origem não foi modificado.
- `pnpm db:permissions`: passou validação dos grants de runtime, migração e allowlist de replicação.
- `pnpm test:integration`: passou PostgreSQL/Electric; verificação de escrita ficou em transação revertida.
- Proprietário confirmou pelo navegador normal do dev admin criar/editar parque e turbina e técnico consultar sem editar. A captura do preview `P002` não foi confirmada; não atribuir a ela qualquer gravação.
- PostgreSQL, Mailpit e Electric continuaram saudáveis; os bancos de integração e restauração são temporários e foram removidos. Nenhuma alteração operacional foi feita no workspace real durante esta validação automatizada.
- Proprietário confirmou depois a validação completa no Android físico. iPhone não validado.
- A API temporária na porta 3002 e o Vite temporário na 5175 foram encerrados. O proprietário removeu portproxy e regra de firewall em PowerShell como Administrador; verificação posterior confirmou ausência das regras e falha de conexão na porta 5175. Lifecycle de exclusão/arquivamento com issues e catálogo offline permanecem fora desta slice.
