# D06 — Validar fluxo de entrega e deploy

## Status

Concluída — 08/11/2026

- [x] Task concluída

## Responsável

Codex; proprietário configura restrições do GitHub quando necessário.

## Objetivo

Entregar fluxo repetível do commit validado até imagens imutáveis e rollout controlado.

## Escopo e exclusões

Workflows, scripts e artefatos de deploy; nenhum acesso administrativo irrestrito para chave do pipeline.

## Estado atual

CI/deploy e scripts SSH estão ativos. O workflow publica API/web por SHA, serializa deploy em produção e condiciona rollout ao CI verde, push da origem e controles `PUBLISH_IMAGES`/`DEPLOY_ENABLED`. O proprietário confirmou ruleset de `main`, Environment `production`, deploy por chave com forced command, e o rollout foi observado saudável por digest na VPS. Migrations foram repetidas com sucesso. Uma chave SSH dedicada `codex-windops` está restrita ao wrapper de deploy e consulta de metadados selecionados. A PR #13 foi mergeada e o deploy foi associado a SHA/digests e runs por labels OCI observadas no host. Falha pré-rollout, rollback com candidato unhealthy e recuperação de fila PWA pendente foram ensaiados; o proprietário confirmou que a fila zerou e a issue apareceu uma vez após reconectar. D06 concluída. Rollback automático de schema continua fora do fluxo.

## Revisão das recomendações externas — 01/11/2026

O material enviado pelo proprietário recomenda GitHub Actions + GHCR + Docker Compose, imagens identificadas por SHA, Neon configurado fora do workflow, migrações controladas, health check e rollback. O CI roda em PR/push na `main`; após CI verde num push da `main`, `deploy.yml` publica imagens separadas `api` e `web` por SHA quando `PUBLISH_IMAGES=true`. Com `DEPLOY_ENABLED=true`, publicação bem-sucedida segue para deploy SSH restrito. O deploy resolve tags para digests, aplica migração Drizzle numa etapa serializada, aguarda health checks e tenta restaurar a imagem anterior se o runtime não ficar saudável. Não automatiza rollback de schema.

O Compose de produção já inclui Caddy como container, com HTTPS em 80/443; o Compose de desenvolvimento mantém PostgreSQL local, enquanto produção usa Neon externo. A instância deve ser provisionada uma vez antes dos deploys automáticos; não é necessário workflow root/Ansible recorrente. Deploy remoto requer `DEPLOY_ENABLED=true`, configuração de `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` e `DEPLOY_KNOWN_HOSTS`, além do acesso pull-only ao GHCR no host.

Diferença que precisa de decisão: o conteúdo compartilhado recomenda `.env.production` protegido no próprio servidor, que é exatamente o modelo atual do deploy versionado. A preferência anterior do proprietário foi cadastrar variáveis no painel Docker Manager da Hostinger. O painel gerencia variáveis de projetos Docker Manager; isso não injeta automaticamente valores em um `docker compose` iniciado pela rotina root-owned atual. A Action oficial da Hostinger recebe uma API key/ID da VM e pode receber variáveis no próprio workflow; usar esse caminho sem validação pode mover segredos ao GitHub e não demonstra as garantias atuais de migração/health/rollback. Não trocar a orquestração por essa Action sem confirmar preservação das variáveis, pull GHCR privado, migração serializada e rollback.

O material foi revisado e os pontos técnicos acima conferidos contra os workflows, Compose, scripts de deploy e documentação oficial da Hostinger. O link compartilhado originalmente não abriu no navegador; o proprietário colou o conteúdo integral nesta conversa. Sem alterações de código ou teste remoto nesta revisão.

## Dependências

D03; D04/D05 para execução remota.

## Plano

- [x] Completar CI com suites relevantes de parks/issues, banco descartável, migrações, grants, integrações, builds e validação dos runtimes. CI verde é condição para publicar; workflow limita permissões e não executa deploy em PR.
- [x] Configurar ruleset ativo da `main` exigindo PR/CI e bloqueando force push/exclusão, conforme confirmação do proprietário; configurar Environment `production` com os dados de deploy necessários.
- [x] Preservar deploy apenas do SHA de `push` aprovado pelo CI da mesma origem e serializar produção com concurrency group; comportamento está implementado no workflow.
- [x] Publicar imagens GHCR imutáveis por SHA/digest e confirmar pull/execução na VPS; autenticação Actions usa chave restrita, forced command e known_hosts. `PUBLISH_IMAGES` e `DEPLOY_ENABLED` são controles separados.
- [x] Avaliar integração Hostinger Docker Manager/API: o proprietário escolheu o `.env.production` root-owned na VPS, integrado ao deploy existente. Não usar o Docker Manager como secret store do runtime; não enviar segredos da aplicação ao GitHub Actions.
- [x] Aplicar migrações serializadas e repetir o migrador; execução de produção repetida retornou `MIGRATION_REPEAT_OK`. A prevenção de concorrência/obsolescência está codificada por lock/concurrency.
- [x] Documentar que rollback de imagem não reverte schema e definir recuperação do primeiro release sem imagem anterior (corrigir candidato e reaplicar); o primeiro rollout falho foi corrigido antes de registrar release.
- [x] Exercitar falha antes do rollout e rollback após release anterior saudável. O pull de um SHA inexistente falhou antes de migração/containers sem afetar health; um SHA web sabidamente inválido falhou no health e restaurou API/web anteriores saudáveis.
- [x] Confirmar compatibilidade do release anterior com fila PWA pendente em aparelho/browser real. Durante o rollback, o aparelho ficou offline com uma issue pendente; após reconectar, o proprietário confirmou fila zerada e uma única issue sincronizada.
- [x] Completar rastreabilidade do deploy ativo com SHA Git e URL/run correspondentes; `release-info` confirmou `RELEASE_SHA` no `.release.env` e os labels OCI associaram ambos os digests ativos ao mesmo SHA e URLs dos runs.
- [x] Atualizar manual de deploy conforme o fluxo atual de VPS/Compose, migration, health, release env e reconciliação da janela. Manter automação restrita a validadores até D10.

## Contratos e dados afetados

Workflows, scripts e artefatos de deploy; nenhum acesso administrativo irrestrito para chave do pipeline.

## Testes e aceite

CI e deploy observados no GitHub/destino, ensaios de falha registrados e mesmo SHA rastreável até o runtime. Validação sintática sozinha não conclui a task.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

Primeira tentativa de rollout — 02/11/2026: CI run `74` passou para SHA `c076f1d7428861d0701506ad3e47c882e37bed21`; Deploy run `67` publicou API/web, mas ficou sem deploy enquanto `DEPLOY_ENABLED=false`. Após habilitar deploy, Deploy run `68` publicou novamente e iniciou job remoto; SSH falhou em host-key verification antes de executar o wrapper. Log mostra `DEPLOY_HOST=187.41.111.202` e `No ED25519 host key is known for 187.41.111.202`; o `KNOWN_HOSTS` previamente cadastrado contém entradas hashed do hostname `windops.devleonardo.com.br`. Nenhum comando de deploy chegou à VPS. Próximo passo: alinhar `DEPLOY_HOST` no Environment `production` ao hostname fixado (ou adicionar entrada IP baseada na fingerprint já verificada) e reexecutar somente o job falho do Deploy run `68`.

Rerun de Deploy run `68` — 02/11/2026, tentativa 2: com `DEPLOY_HOST=windops.devleonardo.com.br`, SSH e autenticação passaram; API/web foram baixadas, migration rodou e API ficou `Healthy`. `docker compose up --wait` falhou porque `windops-web-1` ficou `unhealthy`, e o script informou que não encontrou release anterior para restaurar. O deploy não gravou `.release.env` nem aplicou reconciliação da janela. Diagnosticar probe `/healthz` do Caddy e estado dos containers antes de qualquer rerun; se a janela continuar sem release, Electric pode permanecer ativo.

Diagnóstico posterior na VPS: `windops-web-1` aparece `running/healthy`, mas os logs incluem várias linhas `exec /usr/bin/caddy: operation not permitted`; `/opt/windops/.release.env` segue ausente. Integração GitHub não tem permissão `Actions: write` para reexecutar run `68` (HTTP 403). Pode-se usar a UI **Re-run failed jobs** depois de confirmar que o web continua `healthy`; ainda não há rollout aceito.

Tentativa 3 do run `68` — 02/11/2026: confirmou repetição do mesmo resultado; imagens no host, migration repetida, API saudável, web recém-iniciado e marcado `unhealthy` imediatamente. Rollout abortado, `.release.env` ausente; nenhum release aceito. Não repetir sem diagnóstico detalhado de `State.Health.Log`, healthcheck configurado, processo/args e logs Caddy; Electric não foi reconciliado.

Diagnóstico do erro de execução — 02/11/2026: inspeção enviada pelo proprietário confirmou processo `caddy`, imagem web de SHA `c076f1d7428861d0701506ad3e47c882e37bed21`, usuário `10001:10001`, `cap_drop: ALL`/`no-new-privileges` no Compose e repetidos `exec /usr/bin/caddy: operation not permitted`. A imagem oficial Caddy traz `cap_net_bind_service` no binário; com todas as capabilities removidas, o kernel bloqueia a execução. Como os listeners configurados são 8080/8443 e health 8081, alterado `infra/Dockerfile.web` para remover a capability de arquivo com `setcap -r` durante o build e remover `libcap-utils` depois. `pnpm check` passou: Biome/boundaries, typechecks, 86 testes e builds API/web. Docker daemon local indisponível (`permission denied` no socket), portanto a imagem alterada ainda não foi construída nem exercitada; precisa novo SHA/CI, publicação e deploy para confirmar. Sem release de produção aceito até essa confirmação.

Rollout concluído — 02/11/2026: proprietário confirmou frontend acessível por HTTPS e compartilhou `docker compose ps` com API e web `healthy` por 59 minutos. Imagens ativas: API `ghcr.io/leo-rodrigs-a/windops-api@sha256:3db6910362788788e40707c154455daddabe14869f01d6aa249f77c882a62159`; web `ghcr.io/leo-rodrigs-a/windops-web@sha256:cc53d0b36b1e7728b6ecfe87c813476211f895aca46d9133bc166416e8db23c8`. Isso comprova rollout e saúde dos containers no momento da captura; teste externo confirmou HTTPS e não exposição das portas internas. Ainda faltam health endpoints públicos, teste autenticado/Google/e-mail e evidência do release SHA e timer Electric.

Primeiro deploy — 02/11/2026: proprietário confirmou que o deploy funcionou e que o frontend está servindo HTTPS. Isso confirma a correção operacional do container web no destino. Ainda não foram registrados aqui SHA/digest do release, health da API após o deploy, execução da janela Electric nem validação do login/admin; manter D06 aberta até evidências do pipeline/health e encaminhar validações de bootstrap para D08.

Atualização de health — 02/11/2026 America/Sao_Paulo (03/11 UTC): proprietário executou `curl.exe -i` em `/api/health/live` e `/api/health/ready`; ambos retornaram `200 OK` via Caddy/HTTPS com HSTS. `ready` executa `SELECT 1`, confirmando API conectada ao Neon. Digests atuais foram associados ao deploy na evidência de rollout. SHA Git/URL do workflow e estado do timer Electric ainda faltam.

Preparação de rastreabilidade — 08/11/2026: o workflow passou a gravar labels OCI nas imagens com repositório, SHA de origem, ID/URL do run CI e ID/URL do run de publicação/deploy. `scripts/deploy.sh` inclui `RELEASE_SHA` junto dos digests em `.release.env`, preservando a relação do release ativo com o commit; o manual explica os campos. `bash -n scripts/deploy.sh scripts/deploy-ssh-entrypoint.sh scripts/electric-window.sh`, `git diff --check` e `docker compose ... config --quiet` com imagens/SHA sintéticos passaram. A primeira execução de `pnpm check` encontrou apenas formatação em `.agent/tasks/11-producao/README.md` e `.agent/tasks/14-dominio-principal/README.md`; ambos foram formatados com Biome. A nova execução de `pnpm check` passou: lint/boundaries, typecheck, 86 testes e builds de contracts/API/web. Naquele momento, a nova metadata ainda não estava no release ativo; o deploy posterior da PR #13 ocorreu nesta mesma data e está descrito abaixo. A associação direta dos digests ativos aos labels ainda não foi observada no host.

Acesso SSH restrito — 08/11/2026: o proprietário criou a conta `codex-windops` na VPS e instalou a chave pública dedicada com forced command para `/usr/local/sbin/windops-deploy-ssh`, além de sudo limitado ao deploy. O teste com `StrictHostKeyChecking=yes` autenticou e recebeu `Only deploy <40-character commit SHA> is accepted.` para comando inválido (exit code 64), confirmando o wrapper e ausência de shell arbitrário. Chave privada permanece em `~/.ssh/codex-windops`, fora do repositório; nenhum segredo foi copiado para evidências.

Deploy e recuperação — 08/11/2026: GitHub mostra a PR #13 mergeada no commit `431ca3dabd61a02bc93859f10575af777c48f8df`; o proprietário confirmou deploy bem-sucedido. `curl` por HTTPS retornou HTTP 200 em live/ready e `/` antes dos ensaios. Falha pré-rollout: `deploy 0000000000000000000000000000000000000000` terminou com `manifest not found` no pull da API; depois, live/ready/root seguiram HTTP 200. Falha pós-release: `deploy c076f1d7428861d0701506ad3e47c882e37bed21` puxou imagens API (`sha256:4680fe37a55a7b5d92f9442d1c5f322644b7b789f6161f13fa24d5b932c378d0`) e web (`sha256:11e7d7ce1db2ebd90f8bafa0f5714c13c4a67205a17631a8cbf989aa2da51403`); migração prosseguiu, API ficou healthy e web ficou unhealthy. O script reportou restauração das imagens anteriores; API e web passaram health checks. O comando retornou exit 1, esperado para o candidato rejeitado; live/ready/root retornaram HTTP 200 após rollback. Comparação local entre `c076…` e o commit da PR não encontrou migrations nem alterações nos caminhos de persistência offline; não foi simulada uma fila pendente real em PWA. O teste não reverteu schema. O acesso SSH permanece limitado ao wrapper, então os digests ativos e labels OCI de SHA/URLs não puderam ser lidos no host; associação de release segue pendente.

Rastreabilidade do release ativo — 08/11/2026: o comando restrito `release-info` no host confirmou `.release.env RELEASE_SHA=not-recorded` e inspecionou somente o nome de imagem e labels OCI dos containers ativos. API: `ghcr.io/leo-rodrigs-a/windops-api@sha256:3fce2ba00e2d76485f590de3145c50168d462fe62b7cf67a7c535ed18a6a9cd4`; web: `ghcr.io/leo-rodrigs-a/windops-web@sha256:ae6f1bcef7ad153d0e234345d1f5e4c9403c6f507cb1f812427d7bbef8818f5d`. Ambos identificam revisão `431ca3dabd61a02bc93859f10575af777c48f8df`, CI [run 42497042208](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497042208) e deploy [run 42497240518](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497240518). Logo, os OCI labels rastreiam os digests ativos mesmo sem `RELEASE_SHA` no arquivo de release atual. Nenhum segredo foi lido.

Atualização do metadado local — 08/11/2026: o proprietário inseriu o SHA `431ca3dabd61a02bc93859f10575af777c48f8df` em `.release.env` sob lock de deploy e atualizou o helper root-owned a partir do commit revisado. `release-info` confirmou `RELEASE_SHA=431ca3dabd61a02bc93859f10575af777c48f8df`; o helper atualizado gravará o campo nos próximos deploys bem-sucedidos.

Rollback com fila local pendente — 08/11/2026: o proprietário confirmou uma issue pendente na PWA e manteve o aparelho offline durante novo ensaio do SHA `c076f1d7428861d0701506ad3e47c882e37bed21`. API/web candidatas foram recriadas; API ficou healthy e web unhealthy; o wrapper restaurou as imagens anteriores e o web voltou a healthy. Depois do rollback, live/ready/root responderam HTTP 200. Após reconectar, o proprietário confirmou que a fila zerou e a issue apareceu uma única vez. A confirmação funcional é do proprietário; não foi feita contagem direta de linhas/eventos no banco. A compatibilidade da fila durante a recuperação está aceita.
