# D10 — Liberar piloto e entregar rotina de operação

## Status

Em andamento

- [ ] Task concluída

## Responsável

Proprietário confirma liberação; Codex executa e registra.

## Objetivo

Abrir o app para o piloto com um procedimento de atualização e suporte compreendido.

## Escopo e exclusões

Release, acessos operacionais e documentação final; escopo do produto continua piloto texto/um workspace com autorização tenant.

## Estado atual

Liberação depende de evidências do destino. A cadeia de CI/deploy, SHA/digests, migrations, health e rollback de imagem já foi reunida em D06; isso ainda não atende os gates de backup/restore, auth/tenant, alertas e aparelhos.

## Dependências

D01–D09 concluídas e O04 encerrada; escopo móvel explicitamente registrado.

## Plano

- [x] Consolidar evidência disponível de CI, SHA/digests, migrações, health e rollback de imagem em [D06](06-ci-cd.md) e [guia de produção](../../../docs/producao.md). Auth/tenant, restore/alertas e matriz de aparelhos permanecem bloqueadores abertos para esta consolidação final.
- [x] Atualizar instruções do manual para o runtime VPS/Compose e deploy efetivamente observado, incluindo migration, health, `.release.env` e reconciliação da janela; revisão integral final permanece pendente.
- [x] Confirmar deploy condicionado ao CI aprovado e observar atualização rastreável/saudável da PR #13 após o rollout inicial; a atualização ocorreu antes da abertura do piloto.

- [ ] Consolidar checklist de release com links de CI, SHA/digests, migrations, auth/tenant, restore/rollback, alertas, aparelhos e limitações; resolver bloqueadores antes de liberar.
- [ ] Revisar README do início ao fim: comandos e variáveis reais, VPS e alternativa PaaS com grau de validação indicado, rotina diária, deploy/rollback e responsáveis. Eliminar instruções provisórias incompatíveis com o destino escolhido.
- [ ] Proprietário confirmar data, participantes, canais de suporte, plataformas efetivamente suportadas e abertura do piloto a partir da versão candidata já revisável; registrar aceite.
- [ ] Ativar deploy contínuo condicionado ao CI conforme política acordada (DEPLOY_ENABLED quando aplicável), liberar participantes e acompanhar primeira atualização normal com smoke pós-deploy.
- [ ] Observar janela operacional definida em D02/D07, checar alertas, backups e sincronização real; registrar incidentes/limites e responsáveis por continuidade.
- [ ] Atualizar índices, memória, arquitetura e roadmap com evidências, fechar apenas itens realmente entregues e sugerir commit. Nenhuma meta de disponibilidade vira promessa sem medição.

## Contratos e dados afetados

Release, acessos operacionais e documentação final; escopo do produto continua piloto texto/um workspace com autorização tenant.

## Testes e aceite

Aplicação liberada e operável, atualização rastreável e manual utilizável pelo proprietário/dev. Tasks de implementação só concluídas com evidência, não pela existência do plano.

## Evidências

Planejamento em 30/10/2026. Auditoria em 08/11/2026: checklist técnico parcial de D06 já está consolidado; atualização do manual referente ao deploy também foi entregue e a PR #13 foi observada saudável após CI/deploy. Revisão final do manual, decisão/aceite do proprietário, participantes/canais de suporte e acompanhamento do piloto permanecem pendentes. Nenhum piloto foi aberto.
