# Slice 11 — Preparação e entrada em produção

## Status

Concluída em 08/11/2026. D01–D10 entregues. Destino: Hostinger KVM1 no Brasil, Ubuntu 24.04.5, Docker/Compose e Neon Free. Custo informado: R$625 por 24 meses; sem despesas adicionais planejadas nem homologação permanente. Política Hostinger de dois snapshots semanais e meta de recuperação aceitas; uma captura em 08/11 mostrava um ponto disponível. Nenhum backup foi restaurado; proprietário retirou testes de PITR Neon e rollback compatível com schema do escopo. Runbooks e política de monitoramento estão documentados. Os dois monitores HTTPS estão `Up`, o proprietário recebeu alerta de teste e a página pública é https://stats.uptimerobot.com/kwNQpc0mCF. Revisões manuais semanais de recursos hPanel e verificações de Electric/slot após retomada, reboot e deploy estão definidas; não há alertas automáticos para esses sinais. Proprietário confirma cenários funcionais D08/D09 aprovados em Android, iPhone e PWA desktop, usando as versões mais atuais disponíveis; números exatos não disponíveis. O piloto abriu em 04/11/2026; um cliente usa Android, sem incidentes reportados desde então; suporte ocorre por WhatsApp diretamente com o proprietário. Simulação de quota/evicção e medição p95 <2s foram retiradas do escopo, sem afirmar validação.

- [x] Slice concluída

## Resultado esperado

Wind Ops disponível em HTTPS para o piloto, com desenvolvimento reproduzível, implantação rastreável, política/runbooks de recuperação documentados e manual que permita ao desenvolvedor trabalhar e operar a aplicação. O rollback de imagem foi ensaiado; restore Hostinger/Neon foi retirado do escopo. O proprietário confirmou que o cliente usa a produção desde 04/11/2026; D10 registra os detalhes operacionais e o acompanhamento.

## Base existente e lacunas

As slices 01–10 de produto foram encerradas; O04 terminou por aceite em 31/10/2026. Nesta slice, D01–D10 foram concluídas. VPS/Neon, CI/GHCR/deploy por SHA, migrações, bootstrap, auth/tenant, alertas HTTPS e validações funcionais em Android/iPhone/PWA desktop têm evidências em seus planos. Render está apenas documentado e não foi implantado. O proprietário confirmou que o piloto abriu em 04/11/2026, um cliente usa Android e não houve incidentes desde o lançamento. O suporte é por WhatsApp diretamente com o proprietário, responsável pela continuidade.

## Limites e decisões

- Preservar monólito modular, serviços públicos entre módulos, autorização tenant, segundo passo obrigatório e linking verificado. Electric fica privado, acessado pelo proxy autorizado com filtros do servidor.
- A escolha atual é Hostinger KVM1 ativo no Brasil, Ubuntu 24.04.5, 1 vCPU/4 GB + Neon Free; Docker/Compose estão instalados. Carga do KVM1 e custo/impacto de eventual upgrade para KVM2 (2 vCPU/8 GB) serão medidos antes do piloto. A tentativa Oracle A1 em São Paulo falhou por falta de capacidade na AD-1. Hetzner Cloud permanece alternativa avaliada; Render requer adaptações documentadas.
- README deve ensinar VPS e uma alternativa PaaS concreta. Provisionar e validar um destino escolhido; não duplicar ambientes pagos para comprovar ambos. A alternativa não executada fica identificada como tal.
- Sem homologação permanente por padrão; D02 confirma isso. Ensaios destrutivos/restore usam ambiente descartável isolado, nunca os dados operacionais.
- O proprietário contrata/cria contas, escolhe parâmetros e disponibiliza acessos; Codex prepara instruções, configura, testa e documenta o que estiver autorizado e acessível. Credenciais ficam em secret stores/host, nunca nos planos/chat/logs/VITE_.
- Preservar fila offline em restart, retry, conflitos, atualização e recuperação. Backup do banco não protege trabalho ainda não sincronizado no aparelho.
- Não alterar layouts/Pencil nem ampliar produto. Android/iPhone e metas operacionais só recebem declaração de suporte/resultado após validação correspondente.

## Ordem e responsabilidades

| Task                                  | Entrega                                      | Responsável                                                                   | Dependências                                                                |
| ------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [x] [D01](01-readme-manual.md)        | README como manual do desenvolvedor          | Codex                                                                         | Nenhuma; primeira tarefa da slice.                                          |
| [x] [D02](02-escolha-hospedagem.md)   | Escolher hospedagem e parâmetros do piloto   | Proprietário decide; Codex prepara comparação                                 | D01.                                                                        |
| [x] [D03](03-preparacao-app.md)       | Preparar aplicação e artefatos de produção   | Codex                                                                         | D01; D02 para adaptações específicas do destino.                            |
| [x] [D04](04-contas-acessos.md)       | Criar ambientes, contas e fornecer acessos   | Proprietário; Codex fornece instruções e confere                              | D02; pode ocorrer junto de D03.                                             |
| [x] [D05](05-infra-banco.md)          | Provisionar runtime, banco e rede            | Codex; proprietário executa ações de console sem acesso delegado              | D03 e D04.                                                                  |
| [x] [D06](06-ci-cd.md)                | Validar fluxo de entrega e deploy            | Codex; proprietário configura restrições do GitHub quando necessário          | D03; D04/D05 para execução remota.                                          |
| [x] [D07](07-operacao-recuperacao.md) | Backups, recuperação e monitoramento         | Codex; proprietário confirma metas e recebe alertas                           | D05 e D06 para ensaiar recuperação de release.                              |
| [x] [D08](08-primeiro-deploy.md)      | Primeiro deploy e bootstrap do piloto        | Codex; proprietário identifica admin e acompanha login real                   | D05, D06, D07 e O04 da slice 10 concluída.                                  |
| [x] [D09](09-validacao-campo.md)      | Validar aparelhos e fluxo de campo           | Proprietário executa em aparelhos; Codex prepara roteiro, acompanha e corrige | D08.                                                                        |
| [x] [D10](10-liberacao-piloto.md)     | Liberar piloto e entregar rotina de operação | Proprietário confirma liberação; Codex executa e registra                     | D01–D09 concluídas e O04 encerrada; escopo móvel explicitamente registrado. |

D01 começa sem aguardar contas. D03 e D04 avançaram em paralelo após D02; D03 prepara artefatos locais e está concluída. D05 comprovou banco/rede/replicação e reinício no destino sem depender de bootstrap; D06 prova a entrega; D07 prova recuperação/operação; D08 faz bootstrap e executa smoke autenticado, incluindo shape/isolamento, depois de D05–D07; D09 testa o uso real; D10 abre o piloto. O04 está satisfeita pelo encerramento da slice 10. O Google já aceito em dev não dispensa validar callback/origem no domínio final.

## Critérios de encerramento

- [x] D01–D10 entregues com evidências e responsáveis.
- [x] Manual organizado na ordem projeto → setup do zero → rotina diária → produção e revisado para refletir o destino e o deploy observados; Render está identificado como alternativa não validada.
- [x] Produção isolada do dev; HTTPS, auth/tenant, sync e notificações funcionais foram confirmados em produção pelo proprietário.
- [x] CI/deploy, configuração de backups, alertas HTTPS e rollback de imagem registrados; restore Hostinger/Neon foi retirado do escopo e permanece não ensaiado.
- [x] Aceite funcional do proprietário e plataformas efetivamente incluídas no piloto registrados; não prometer suporte além do Android utilizado pelo cliente.
- [x] Liberação do piloto e acompanhamento reportado (nenhum incidente desde 04/11) registrados, sem prometer SLA ou background sync garantido.

## Referências consultadas no planejamento

Inspeção do repositório: README, arquitetura/memória, slice 10/O04, scripts de deploy, CI, Compose, Dockerfiles e exemplos sem segredos. Estado inicial do Git limpo.

Consulta oficial em 30/10/2026: [Hetzner Cloud](https://docs.hetzner.com/cloud/), [serviços privados no Render](https://render.com/docs/private-services) e [discos persistentes no Render](https://render.com/docs/disks). Render é candidato a avaliar: serviço privado permite restringir acesso à rede interna; disco persistente tem limitações de instâncias e interrompe o serviço durante redeploy. Isso precisa entrar no ensaio de disponibilidade, não constitui escolha nem prova de compatibilidade do Wind Ops. Custos e condições devem ser reconferidos em D02.

## Evidências do planejamento

30/10/2026 — Dez tasks executáveis criadas com responsáveis, dependências, checklists e aceite. Nenhuma task de implementação marcada concluída. Verificação documental registrada na memória; sem mudança de fonte/infra, contratação ou deploy nesta etapa.

31/10/2026 — D01 concluída: manual/guia entregues e setup isolado, reaplicação, permissões, auth/workspaces, build, restore e dev/Preview HTTP validados. `pnpm check` encontrou formatação preexistente; detalhes e limites em D01. D02 é a próxima tarefa; nenhum deploy remoto executado.

02/11/2026 — D03 concluída no escopo de preparação local. `pnpm check` passou com 86 testes; produção Compose sintética, Dockerfile API, units/calendar systemd, scripts e documentação passaram validações. Janela diária do Electric foi confirmada/preparada. Arquitetura/carga do host, instalação efetiva do timer, scale-to-zero, cold-start e sync real foram realocados para D05/D08 porque dependem de infraestrutura provisionada e release implantado; não são declarados comprovados.

08/11/2026 — D06 concluída: `pnpm check` passou com 86 testes; PR #13 foi implantada e os digests ativos foram associados ao SHA e runs por labels OCI. Em produção, SHA inexistente falhou no pull sem afetar serviços; candidato conhecido por web unhealthy acionou rollback, que restaurou containers saudáveis. Com uma issue pendente na PWA offline durante novo ensaio de rollback, o proprietário confirmou fila zerada e issue sincronizada uma vez após reconexão. D07 é a próxima task; backup/restore e monitoramento permanecem pendentes.

08/11/2026 — Auditoria D07–D10 contra memória, slices anteriores, D02/D05/D06 e documentação: marcados em D07 a política de backup/RTO aceita, falha pré-rollout, rollback de imagem, checks manuais e preservação da fila; em D08, SHA/runs do release atual e ensaios de pausa/retomada/reboot; em D09, baseline histórico de Android dev, browser desktop, push Preview e fila offline; em D10, consolidação parcial do checklist técnico de CI/release, atualização do manual de deploy e observação da atualização saudável da PR #13. O proprietário esclareceu que os ensaios referidos foram reboot da VPS e rollback de imagens, sem restore de backup Hostinger ou Neon. Capturas depois confirmaram um backup semanal Hostinger disponível (2026-11-08 06:20) e janela Neon PITR de seis horas em `production`; nenhum restore foi executado e o proprietário retirou o teste Neon do escopo. Runbooks/protocolo SLO foram documentados; D07–D10 seguem abertas: esclarecer retenção Hostinger e configurar/testar alertas externos, auth/bootstrap/tenant em produção não foi validado, a matriz Android/iPhone de produção não existe e o piloto não foi aberto. Fontes e limites estão detalhados em cada task; D07 segue como próximo trabalho.

08/11/2026 — D09 concluída com base no relato do proprietário de testes funcionais em produção aprovados no Android, iPhone e PWA desktop, nas versões mais atuais disponíveis. A estimativa de storage foi registrada como informação somente de leitura (12,7 MiB/2048 MiB, 0,6%, `persisted=true`). Por decisão do proprietário, simulação de quota/evicção e medição numérica p95 <2s foram retiradas dos critérios; esses comportamentos/metas não são declarados validados. D10 é a próxima tarefa e depende da decisão explícita do proprietário de abrir o piloto.

08/11/2026 — D10 concluída: release checklist consolidado; README/guia e arquitetura atualizados para refletir o destino Hostinger, Render não validado, fluxo CI/deploy e limitações aceitas. O proprietário confirmou piloto aberto em 04/11/2026, um cliente usando Android, nenhum incidente desde a abertura, deploy após CI aprovado e suporte via WhatsApp diretamente com ele, responsável pela continuidade.

08/11/2026 — D07 concluída após o proprietário aprovar a política manual de monitoramento: dois probes HTTPS UptimeRobot ativos com alerta de teste recebido; revisão semanal de CPU/RAM/disco no hPanel; verificação do Electric/slot após retomada, reboot e deploy; confirmação de sync no fluxo normal. Sem alertas automáticos de recursos/WAL/slot/sync ou aviso antecipado TLS. Testes de restore Neon e rollback compatível com schema removidos do escopo por decisão do proprietário. D08 passa a ser a próxima task.

08/11/2026 — Auditoria inicial D08: digests/SHA/runs do deploy atual referenciados em D06 e manual; health HTTPS/live/ready e isolamento das portas internas confirmados; Better Auth habilitado em runtime e `/api/auth/providers` retornou 200; retomada do Electric/slot após scale-to-zero e reboot comprovada em D05; preservação de fila durante rollback comprovada em D06. Restore/resnapshot após restore não é gate por decisão do proprietário. Permanecem sem evidência de produção: cadastro/verificação/login real, OTP/Google e linking/cookies, bootstrap explícito admin/workspace, autorização de shapes/tenant/filtros, convite/perfil técnico, e-mail/push, sync entre contas, wake/outbox após pausa, CPU/RAM e cold-start. Não registrar dados pessoais ou segredos no repositório.

02/11/2026 — D04 concluída por confirmações do proprietário: OAuth Google de produção configurado; environment `production` com entradas de deploy e variável do repositório `DEPLOY_ENABLED=false`; usuário SSH restrito testado com comando inválido rejeitado; scripts de deploy instalados na VPS; ruleset ativo da `main` reportado; metadados Neon identificados; conta pessoal escolhida como admin e workspace nomeado `Elevadores`. O nome/e-mail da conta não foi repetido nos artefatos por o repositório ser público, e nenhuma senha foi registrada. Cadastro/verificação da conta, bootstrap efetivo, roles/grants/TLS, GHCR e deploy continuam em D05/D06/D08. Não houve deploy nem teste OAuth/e-mail de produção.
