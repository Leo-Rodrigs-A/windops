# Slice 11 — Preparação e entrada em produção

## Status

Em andamento. D01–D05 concluídas; D05 encerrada em 08/11/2026 com provisionamento Neon, firewall/SSH documentados, pausa/retomada do Electric e restart/reboot verificados. Destino: Hostinger KVM1 no Brasil, Ubuntu 24.04.5, Docker/Compose e Neon Free. Custo informado: R$625 por 24 meses; sem despesas adicionais planejadas nem homologação permanente. Backup semanal Hostinger e meta de recuperação aceitos, sem restore ensaiado. Pausa de Neon observada; latência de cold-start não medida. Oracle A1 não foi criada por falta de capacidade em São Paulo/AD-1. Próxima: D06.

- [ ] Slice concluída

## Resultado esperado

Wind Ops disponível em HTTPS para o piloto, com desenvolvimento reproduzível, implantação rastreável, recuperação exercitada e manual que permita ao desenvolvedor trabalhar e operar a aplicação. D01 entregou o README e o guia de produção, com setup local ensaiado. Implantação remota continua nas próximas tarefas.

## Base existente e lacunas

Slices 01–09 entregaram produto e revisão no escopo documentado. A slice 10 está concluída: O04 encerrada por aceite do proprietário em 31/10/2026, com validações automatizadas já registradas e Google real confirmado. Não houve novo ensaio manual pelo agente.

Há Dockerfiles API/web, Compose de produção, Caddy, CI, GHCR/deploy por SHA, migrações, roles locais e scripts SSH restritos. Esses arquivos são ponto de partida: produção/Neon, execução remota dos workflows, restore no destino, alertas e validação móvel ainda precisam de evidências. O exemplo de ambiente contém comentários antigos e a CI não chama explicitamente parks/issues. A ordem de provisionamento inicial de roles/schema/publicação/Electric precisa ser ensaiada.

## Limites e decisões

- Preservar monólito modular, serviços públicos entre módulos, autorização tenant, segundo passo obrigatório e linking verificado. Electric fica privado, acessado pelo proxy autorizado com filtros do servidor.
- A escolha atual é Hostinger KVM1 ativo no Brasil, Ubuntu 24.04.5, 1 vCPU/4 GB + Neon Free; Docker/Compose estão instalados. Carga do KVM1 e custo/impacto de eventual upgrade para KVM2 (2 vCPU/8 GB) serão medidos antes do piloto. A tentativa Oracle A1 em São Paulo falhou por falta de capacidade na AD-1. Hetzner Cloud permanece alternativa avaliada; Render requer adaptações documentadas.
- README deve ensinar VPS e uma alternativa PaaS concreta. Provisionar e validar um destino escolhido; não duplicar ambientes pagos para comprovar ambos. A alternativa não executada fica identificada como tal.
- Sem homologação permanente por padrão; D02 confirma isso. Ensaios destrutivos/restore usam ambiente descartável isolado, nunca os dados operacionais.
- O proprietário contrata/cria contas, escolhe parâmetros e disponibiliza acessos; Codex prepara instruções, configura, testa e documenta o que estiver autorizado e acessível. Credenciais ficam em secret stores/host, nunca nos planos/chat/logs/VITE_.
- Preservar fila offline em restart, retry, conflitos, atualização e recuperação. Backup do banco não protege trabalho ainda não sincronizado no aparelho.
- Não alterar layouts/Pencil nem ampliar produto. Android/iPhone e metas operacionais só recebem declaração de suporte/resultado após validação correspondente.

## Ordem e responsabilidades

| Task                                 | Entrega                                      | Responsável                                                                   | Dependências                                                                |
| ------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [x] [D01](01-readme-manual.md)       | README como manual do desenvolvedor          | Codex                                                                         | Nenhuma; primeira tarefa da slice.                                          |
| [x] [D02](02-escolha-hospedagem.md)  | Escolher hospedagem e parâmetros do piloto   | Proprietário decide; Codex prepara comparação                                 | D01.                                                                        |
| [x] [D03](03-preparacao-app.md)      | Preparar aplicação e artefatos de produção   | Codex                                                                         | D01; D02 para adaptações específicas do destino.                            |
| [x] [D04](04-contas-acessos.md)      | Criar ambientes, contas e fornecer acessos   | Proprietário; Codex fornece instruções e confere                              | D02; pode ocorrer junto de D03.                                             |
| [x] [D05](05-infra-banco.md)         | Provisionar runtime, banco e rede            | Codex; proprietário executa ações de console sem acesso delegado              | D03 e D04.                                                                  |
| [] [D06](06-ci-cd.md)                | Validar fluxo de entrega e deploy            | Codex; proprietário configura restrições do GitHub quando necessário          | D03; D04/D05 para execução remota.                                          |
| [] [D07](07-operacao-recuperacao.md) | Backups, recuperação e monitoramento         | Codex; proprietário confirma metas e recebe alertas                           | D05 e D06 para ensaiar recuperação de release.                              |
| [] [D08](08-primeiro-deploy.md)      | Primeiro deploy e bootstrap do piloto        | Codex; proprietário identifica admin e acompanha login real                   | D05, D06, D07 e O04 da slice 10 concluída.                                  |
| [] [D09](09-validacao-campo.md)      | Validar aparelhos e fluxo de campo           | Proprietário executa em aparelhos; Codex prepara roteiro, acompanha e corrige | D08.                                                                        |
| [] [D10](10-liberacao-piloto.md)     | Liberar piloto e entregar rotina de operação | Proprietário confirma liberação; Codex executa e registra                     | D01–D09 concluídas e O04 encerrada; escopo móvel explicitamente registrado. |

D01 começa sem aguardar contas. D03 e D04 avançaram em paralelo após D02; D03 prepara artefatos locais e está concluída. D05 comprovou banco/rede/replicação e reinício no destino sem depender de bootstrap; D06 prova a entrega; D07 prova recuperação/operação; D08 faz bootstrap e executa smoke autenticado, incluindo shape/isolamento, depois de D05–D07; D09 testa o uso real; D10 abre o piloto. O04 está satisfeita pelo encerramento da slice 10. O Google já aceito em dev não dispensa validar callback/origem no domínio final.

## Critérios de encerramento

- [ ] D01–D10 entregues com evidências e responsáveis.
- [ ] Manual ensinado na ordem projeto → setup do zero → rotina diária → produção, revisado após implantação.
- [ ] Produção isolada do dev, HTTPS, auth/tenant, sync e notificações reais conferidos.
- [ ] CI/deploy, backup/restore, rollback compatível e alertas exercitados no destino.
- [ ] Aceite de cadastro encerrado e matriz de aparelhos concluída para o escopo explicitamente autorizado.
- [ ] Liberação do piloto e operação acompanhada registradas, sem prometer SLA ou background sync garantido.

## Referências consultadas no planejamento

Inspeção do repositório: README, arquitetura/memória, slice 10/O04, scripts de deploy, CI, Compose, Dockerfiles e exemplos sem segredos. Estado inicial do Git limpo.

Consulta oficial em 30/10/2026: [Hetzner Cloud](https://docs.hetzner.com/cloud/), [serviços privados no Render](https://render.com/docs/private-services) e [discos persistentes no Render](https://render.com/docs/disks). Render é candidato a avaliar: serviço privado permite restringir acesso à rede interna; disco persistente tem limitações de instâncias e interrompe o serviço durante redeploy. Isso precisa entrar no ensaio de disponibilidade, não constitui escolha nem prova de compatibilidade do Wind Ops. Custos e condições devem ser reconferidos em D02.

## Evidências do planejamento

30/10/2026 — Dez tasks executáveis criadas com responsáveis, dependências, checklists e aceite. Nenhuma task de implementação marcada concluída. Verificação documental registrada na memória; sem mudança de fonte/infra, contratação ou deploy nesta etapa.

31/10/2026 — D01 concluída: manual/guia entregues e setup isolado, reaplicação, permissões, auth/workspaces, build, restore e dev/Preview HTTP validados. `pnpm check` encontrou formatação preexistente; detalhes e limites em D01. D02 é a próxima tarefa; nenhum deploy remoto executado.

02/11/2026 — D03 concluída no escopo de preparação local. `pnpm check` passou com 86 testes; produção Compose sintética, Dockerfile API, units/calendar systemd, scripts e documentação passaram validações. Janela diária do Electric foi confirmada/preparada. Arquitetura/carga do host, instalação efetiva do timer, scale-to-zero, cold-start e sync real foram realocados para D05/D08 porque dependem de infraestrutura provisionada e release implantado; não são declarados comprovados.

02/11/2026 — D04 concluída por confirmações do proprietário: OAuth Google de produção configurado; environment `production` com entradas de deploy e variável do repositório `DEPLOY_ENABLED=false`; usuário SSH restrito testado com comando inválido rejeitado; scripts de deploy instalados na VPS; ruleset ativo da `main` reportado; metadados Neon identificados; conta pessoal escolhida como admin e workspace nomeado `Elevadores`. O nome/e-mail da conta não foi repetido nos artefatos por o repositório ser público, e nenhuma senha foi registrada. Cadastro/verificação da conta, bootstrap efetivo, roles/grants/TLS, GHCR e deploy continuam em D05/D06/D08. Não houve deploy nem teste OAuth/e-mail de produção.
