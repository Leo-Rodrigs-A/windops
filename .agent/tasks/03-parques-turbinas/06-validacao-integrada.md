# P06 — Validação integrada e encerramento

## Status

Planejada

- [ ] Task concluída

## Objetivo

Comprovar o catálogo completo e registrar limites antes de iniciar chamados.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

P01–P05 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Evidências de testes, documentação e eventuais correções necessárias; não abrir automaticamente a slice de issues.

## Plano de implementação

- [ ] Executar pnpm check e integrações de catálogo, workspaces, autenticação e migrações impactadas. Se o shim voltar a travar, registrar falha e comandos equivalentes reais, sem declarar pnpm check aprovado.
- [ ] Em fixtures descartáveis, validar dois tenants, ambos os cargos, sessão incompleta, revogação/rebaixamento concorrentes, duplicidade e revisão obsoleta.
- [ ] Validar instalação vazia/upgrade preservando dados e persistência após reinício; comprovar que autenticação/equipe continuam funcionando.
- [ ] Exercitar no dev real o percurso admin cadastra parque/turbina, edita e técnico consulta, com códigos de teste combinados com o proprietário. Não apagar contas nem inventar inventário operacional; registrar dados mantidos após teste.
- [ ] Conferir desktop e Android real com o proprietário, temas e formulários; registrar iPhone como não validado se indisponível. Se for necessária exposição temporária WSL/Windows, documentar e remover servidores, portproxy e firewall ao terminar.
- [ ] Revisitar o registro de inconsistências mobile da slice 02, pedir reprodução quando necessário e distinguir defeitos antigos adiados de regressões das novas telas. Não marcar problemas antigos resolvidos sem evidência.
- [ ] Atualizar checkboxes, índice, memória e roadmap com evidências datadas. Manter roadmap 05 parcialmente atendido, pois desativação e catálogo offline continuam pendentes.

## Contratos e dados afetados

Evidências de testes, documentação e eventuais correções necessárias; não abrir automaticamente a slice de issues. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [ ] Aceite: admin grava e técnico apenas consulta; isolamento real; conflitos sem perda silenciosa; dados sobrevivem reinício; percurso UI validado. Documentar bloqueios restantes honestamente e sugerir commit em português com prefixo Conventional Commits.
- [ ] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Planejamento em 26/10/2026. Implementação e validações desta task ainda não executadas.

