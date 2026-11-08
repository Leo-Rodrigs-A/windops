# D10 — Liberar piloto e entregar rotina de operação

## Status

Concluída — 08/11/2026.

- [x] Task concluída

## Responsável

Proprietário confirma liberação; Codex executa e registra.

## Objetivo

Abrir o app para o piloto com um procedimento de atualização e suporte compreendido.

## Escopo e exclusões

Release, acessos operacionais e documentação final; escopo do produto continua piloto texto/um workspace com autorização tenant.

## Estado atual

Pré-requisitos técnicos D01–D09 concluídos. O release candidato em produção está associado ao SHA e aos runs CI/deploy; o deploy condicionado a CI foi observado na PR #13. O proprietário relatou bootstrap e fluxos funcionais aprovados em Android, iPhone e PWA desktop. Dois probes HTTPS estão `Up` e o alerta de teste foi recebido. A política semanal de backup Hostinger está configurada; nenhum restore foi executado, conforme decisão de escopo. Testes Neon PITR e rollback compatível com schema também foram retirados do escopo. A simulação de quota/evicção e p95 numérico foram dispensados em D09, sem alegar validação. O proprietário confirmou que o piloto foi aberto na quarta-feira, 04/11/2026, com um cliente usando Android, e reportou que não houve incidentes desde o lançamento. Definiu que novos deploys seguem o fluxo atual: CI aprovado seguido de deploy. O canal de suporte é WhatsApp diretamente com o proprietário, que responde pela continuidade.

## Checklist consolidado do release candidato

| Item                         | Evidência/status                                                                                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release e CI                 | PR #13; SHA `431ca3dabd61a02bc93859f10575af777c48f8df`; [CI](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497042208) e [deploy](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497240518) passaram. Digests ativos e labels OCI em [D06](06-ci-cd.md). |
| Health e rollback de imagem  | Live/ready/root HTTP 200; falha anterior ao rollout e rollback automático de imagem unhealthy exercitados. Fila PWA offline voltou a sincronizar uma vez, segundo confirmação do proprietário. Ver [D06](06-ci-cd.md).                                                     |
| Auth, bootstrap e tenant     | Proprietário confirma bootstrap, login/OTP/Google, linking, autorização tenant/shapes/filtros e convite/perfis funcionando em produção. Evidência de relato em [D08](08-primeiro-deploy.md) e [D09](09-validacao-campo.md).                                                |
| E-mail, push e sincronização | Proprietário relata e-mail/push, sync, retry/ACK, conflitos, reauth/revogação/exportação como funcionais em produção; sem protocolo caso a caso. [D09](09-validacao-campo.md).                                                                                             |
| Aparelhos                    | Proprietário relata testes aprovados em Android, iPhone e PWA desktop com versões mais atuais disponíveis; números de sistema/navegador não preservados. [D09](09-validacao-campo.md).                                                                                     |
| Monitoramento                | Dois monitores HTTPS UptimeRobot `Up`, alerta de teste recebido; URL e cadência/runbook em [D07](07-operacao-recuperacao.md). Sem alerta automático de recursos, slot/WAL ou sync.                                                                                         |
| Backups/recuperação          | Proprietário informa Hostinger configurado para dois snapshots semanais. Restore Hostinger/Neon dispensado; rollback compatível com schema dispensado; não declarar esses restores/compatibilidade validados. [D07](07-operacao-recuperacao.md).                           |
| Limitações aceitas           | Simulação de quota/evicção e p95 <2s retirados do aceite; estimativa storage foi somente leitura. Sem promessa de SLA ou sync em segundo plano no iPhone. [D09](09-validacao-campo.md).                                                                                    |
| Operação desde a abertura    | Proprietário relata cliente usando Android e nenhum incidente desde 04/11/2026. Isso não representa medição independente de disponibilidade nem substitui a checagem específica de sync.                                                                                   |
| Política de deploy           | Proprietário definiu: manter o fluxo atual de CI aprovado seguido de deploy. Execução registrada em [D06](06-ci-cd.md); variável atual não foi consultada diretamente.                                                                                                     |
| Suporte                      | WhatsApp diretamente com o proprietário, responsável pela continuidade; contato pessoal não registrado.                                                                                                                                                                    |

O checklist técnico e a rotina inicial estão registrados: piloto aberto em 04/11/2026, um cliente usando Android, nenhum incidente relatado desde a abertura, novos deploys após CI aprovado e suporte pelo WhatsApp diretamente com o proprietário. Nenhum nome ou telefone foi registrado.

## Dependências

D01–D09 concluídas e O04 encerrada; escopo móvel explicitamente registrado.

## Plano

- [x] Consolidar evidência de CI, SHA/digests, migrações, health e rollback de imagem em [D06](06-ci-cd.md) e [guia de produção](../../../docs/producao.md).
- [x] Revisar README e guia para runtime VPS/Compose e deploy observado, incluindo migrations, health, `.release.env` e reconciliação da janela.
- [x] Confirmar deploy condicionado ao CI aprovado e observar atualização rastreável/saudável da PR #13 após o rollout inicial; a atualização ocorreu antes da abertura do piloto.
- [x] Incorporar evidências e limitações de D07–D09: monitors HTTPS e alerta testados; backups semanais configurados sem restore; bootstrap e fluxos de produção confirmados pelo proprietário; Android, iPhone e PWA desktop relatados funcionais; quota/evicção e p95 numérico fora do escopo.

- [x] Consolidar checklist de release com links de CI, SHA/digests, migrations, auth/tenant, backup/rollback, alertas, aparelhos e limitações; registrar as exclusões de escopo já aceitas.
- [x] Revisar README e guia de produção para refletir VPS Hostinger validada, PaaS Render apenas documentada, rotina, deploy/rollback observado, escopo de backup/monitoramento e limitações. Corrigir instruções/status provisórios incompatíveis com as evidências mais recentes.
- [x] Proprietário confirmou abertura do piloto na quarta-feira, 04/11/2026, com cliente usando a produção. Registrar sem identificar o cliente.
- [x] Registrar participante sem identificação pessoal e plataforma informada: um cliente usando Android.
- [x] Registrar o canal de suporte: WhatsApp diretamente com o proprietário, responsável pela continuidade.
- [x] Confirmar deploy condicionado ao CI e acompanhar atualização rastreável/saudável; o proprietário definiu que novos deploys seguem o CI aprovado, e a PR #13 está registrada em D06.
- [x] Registrar o acompanhamento reportado desde a abertura: proprietário informa que não houve incidentes desde 04/11/2026. Checks diretos de monitor/backup estão em D07; não inferir uma medição de disponibilidade ou sync contínuo.
- [x] Atualizar índices, memória, arquitetura e roadmap com evidências; registrar aceite, plataforma, período sem incidentes, política de deploy e canal/responsável de suporte. Nenhuma meta de disponibilidade vira promessa sem medição.

## Contratos e dados afetados

Release, acessos operacionais e documentação final; escopo do produto continua piloto texto/um workspace com autorização tenant.

## Testes e aceite

Aplicação liberada e operável, atualização rastreável e manual utilizável pelo proprietário/dev. Tasks de implementação só concluídas com evidência, não pela existência do plano.

## Evidências

Conclusão em 08/11/2026. D01–D09 já estavam concluídas. Evidências reunidas: PR #13 e deploy rastreável no SHA `431ca3dabd61a02bc93859f10575af777c48f8df`, [CI run 42497042208](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497042208), [deploy run 42497240518](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497240518); migrações, liveness/readiness, rollback de imagem e recuperação da fila offline detalhados em D06. Auth/bootstrap/tenant, e-mail/push/sync e testes funcionais em Android, iPhone e PWA desktop foram confirmados pelo proprietário em D08/D09; versões exatas dos sistemas/navegadores não disponíveis. D07 registra dois probes HTTPS ativos e alerta de teste recebido, revisão manual semanal de recursos, política Hostinger informada como dois snapshots por semana e ausência de restore real. Restore Neon, rollback compatível com schema, simulação de quota/evicção e p95 numérico foram retirados do escopo; não são considerados comprovados. VPS Hostinger é o caminho implantado; Render segue apenas documentado. O piloto abriu em 04/11/2026; um cliente usa Android e o proprietário relata ausência de incidentes desde a abertura. Novos deploys seguem CI aprovado seguido de deploy. Suporte será por WhatsApp diretamente com o proprietário, responsável pela continuidade. Nenhum nome ou telefone foi registrado; sem promessa de SLA ou disponibilidade medida.
